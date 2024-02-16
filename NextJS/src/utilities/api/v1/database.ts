import yaml from "yaml"
import { MongoClient, MongoError, MongoServerError, MongoServerSelectionError } from "mongodb";
import { randomString } from "./misc";
import { MongoQRCodeInformation, QRCodeInformation, QRCodeTable } from "@/types/api/v1/QRCode";
import { parse as parseJSONC } from "jsonc-parser"; //! JSONC to support comments in JSON files, for readability
import { QRLinkGlobal } from "@/types/api/v1/global";
declare const global: QRLinkGlobal

export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DatabaseError";
    }
}

export async function bareBonesConnection(mongoConnectionString: string, res:()=>void=undefined, rej:(reason:string)=>string=undefined) {
    const child_process = await import("child_process")
    return new Promise<void>(async (resolve, reject) => {

        const withoutCreds = mongoConnectionString.replace(/mongodb:\/\/(.*)@/g, "mongodb://")
        try {
            const client = new MongoClient(withoutCreds, {
                serverSelectionTimeoutMS: 1000,
                connectTimeoutMS: 1000
            });            
            const succeeded = await client.db().admin().listDatabases().catch((a) => a).then((a) => a)
            if (succeeded instanceof MongoServerError && succeeded.code == 13) { // Unauthorized
                console.log(`[DB] The database at ${process.env.MONGO_URL} is not accessible without credentials (which is expected).`)
                await client.close()
                if (rej) rej("creds_req")
                return reject("creds_req")
            } else if (succeeded instanceof MongoServerSelectionError) {
                console.log("[DB] The database at " + process.env.MONGO_URL + " is not accessible.")
                await client.close()
                if (rej) rej("not_accessible")
                return reject("not_accessible")
            } else if (succeeded instanceof MongoError) {
              console.log("[DB] Encountered an error while attempting to connect to the database:")
              console.error(succeeded)
              await client.close()
                if (rej) rej("error")
              return reject("error")
          }
            console.log(`[DB] Warning: The database at ${process.env.MONGO_URL} is accessible without credentials. We will now attempt to configure the database to be protected from unauthorized access.`)

            // Create account for QRLink
            const authenticatingDatabase = client.db("admin")
            await authenticatingDatabase.command({createUser: process.env.MONGO_USERNAME, pwd: process.env.MONGO_PASSWORD, roles: [{role: "readWrite", db: "QRLink"}]}).then(()=>{
                console.log(`[DB] Created user '${process.env.MONGO_USERNAME}' with password '${process.env.MONGO_PASSWORD}' in the database 'admin'.`)
            }).catch((err) => {
                if (err.code == 51003) {
                    console.log(`[DB] User '${process.env.MONGO_USERNAME}' already exists in the database 'admin'.`)
                } else console.error(err)
            })
            // Create root user 
            let rootUserPasswd = await randomString(32)
            await authenticatingDatabase.command({createUser: "root", pwd: rootUserPasswd, roles: ["root"]}).then(()=>{
                console.log(`[DB] Created user 'root' with password '${rootUserPasswd}' in the database 'admin'. SAVE THIS PASSWORD!`)
            }).catch((err) => {
                if (err.code == 51003) {
                    console.log(`[DB] User 'root' already exists in the database 'admin'.`)
                } else console.error(err)
            })
            await ensureDBSetup(client)
            await client.close()

            const isOpen = await fetch(process.env.MONGO_API_PROTOCOL + "://" + (process.env.MONGO_URL.includes(":") ? process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") : process.env.MONGO_URL+":3010") + "/test").then((res) => res.ok).catch((err) => false)
            if (isOpen) {
                // DOCKER:DOCKER
                console.log("[DB] QRLink has detected that the database has the QRL API enabled. Attempting to configure the database to be protected from unauthorized access...")
                const currentDBConfig = await fetch(process.env.MONGO_API_PROTOCOL + "://" + (process.env.MONGO_URL.includes(":") ? process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") : process.env.MONGO_URL+":3010") + "/mongodb/config").then((res) => res.json()).catch((err) => null)
                if (currentDBConfig) {
                    if (!currentDBConfig["security"]) {
                        currentDBConfig["security"] = {}
                    }
                    currentDBConfig["security"]["authorization"] = "enabled"
                    await fetch(process.env.MONGO_API_PROTOCOL + "://" + (process.env.MONGO_URL.includes(":") ? process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") : process.env.MONGO_URL+":3010") + "/mongodb/config", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(currentDBConfig)
                    }).then((res) => res.json()).catch((err) => console.error(err))
                    console.log("[DB] Updated database configuration.")
                    console.log("[DB] Requesting database restart...")
                    await fetch(process.env.MONGO_API_PROTOCOL + "://" + (process.env.MONGO_URL.includes(":") ? process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") : process.env.MONGO_URL+":3010") + "/mongodb/restart", {
                        method: "POST"
                    }).then((res) => res.json()).catch((err) => console.error(err))
                    console.log("[DB] Database restart completed.")
                    resolve()
                } else {
                    console.warn("[DB] Failed to fetch database configuration.")
                }
            } else {
                //LOCAL:LOCAL
                //LOCAL:DOCKER
                //DOCKER:LOCAL

                if (process.env.IS_DOCKER) {
                    // LOCAL:DOCKER
                    // Guide the user through the process of setting up the database
                    showDBSetupInstructions(true)
                    await new Promise(() => {}) // sleep forever
                } else {
                    // LOCAL:LOCAL
                    
                    // check if connection URL is localhost/127.0.0.1/::1/etc.
                    if (/(localhost|::1|127\.0\.0\.1)(:[0-9]{1,5}|)/g.test(process.env.MONGO_URL)) {
                        if (process.platform == "win32") {
                            showDBSetupInstructions(false)
                            await new Promise(() => {}) // sleep forever
                        }
                        // check if have write permissions to the config file



                        const configLoc = process.platform == "linux" ? "/etc/mongod.conf" : process.platform == "darwin" ? "/usr/local/etc/mongod.conf" : "" // TODO: Add Windows support
                        console.log("[DB] QRLink has detected that the database is running on the same machine as this program, but the database is not set up correctly to be protected from unauthorized access and is not compatible with QRLink.")
                        console.log("[DB] In 10 seconds, the program will automatically make the necessary changes to the database configuration and restart the database.")
                        console.log("[DB] To cancel this process, press CTRL+C now.")
                        await new Promise((resolve) => setTimeout(resolve, 10000))
                        console.log("[DB]")
                        console.log("[DB]")
                        console.log("[DB] Making changes to the database configuration...")
                        console.log("[DB]")
                        if (process.platform == "linux") {
                            const {promises:fs} = await import("fs")
                            try {
                                await fs.access(configLoc, fs.constants.W_OK)
                            } catch {
                                // get current file owner
                                const currentFileOwner = (child_process.spawnSync("ls",["-la", configLoc])).stdout.toString().split(" ")[2]
                                console.log("[DB] User '" + process.env.USER + "' does not have write permissions to the configuration file at " + configLoc + ".")
                                console.log("[DB] QRLink can temporarily add write permissions for user '" + process.env.USER + "' to the configuration file at " + configLoc + " automatically.")
                                console.log("[DB]")
                                console.log("[DB] QRLink will do the following:")
                                console.log("[DB]     1. Give user '" + process.env.USER + "' ownership of the configuration file at " + configLoc + ".")
                                console.log("[DB]     2. Add 'security.authorization = enabled' to the configuration file at " + configLoc + ".")
                                console.log("[DB]     3. Return ownership of the configuration file at " + configLoc + " to '" + currentFileOwner + "' (current file owner).")
                                console.log("[DB]     4. Restart the database.")
                                console.log("[DB]")
                                const readline = (await import('readline')).createInterface({
                                    input: process.stdin,
                                    output: process.stdout
                                })
                                const answer = await new Promise<string>(resolve => {
                                    readline.question("[DB] Would you like to proceed? (y/n) ", resolve)
                                  })

                                if (answer.toLowerCase() == "y") {
                                    readline.close()
                                    console.log("[DB] Configurating...")
                                    console.log("> sudo chown " + process.env.USER + " " + configLoc)
                                    child_process.execSync("sudo chown " + process.env.USER + " " + configLoc)
                                    await editConfiguration(configLoc)
                                    console.log("> sudo chown " + currentFileOwner + " " + configLoc)
                                    child_process.execSync("sudo chown " + currentFileOwner + " " + configLoc)
                                    await restartDatabase()
                                    
                                    console.log("[DB] Database configuration updated and database restarted, verifying...")
                                    await bareBonesConnection(mongoConnectionString, res, rej).then(()=>{throw new DatabaseError("Attempt for verifying updated configuration failed.")}).catch(()=>null)

                                } else {
                                    console.log("[DB] The database will not be set up correctly and QRLink will not work.")
                                    readline.close()
                                    showDBSetupInstructions(false)
                                    await new Promise(() => {}) // sleep forever
                                }
                            }
                        }
                        await editConfiguration(configLoc)
                        await restartDatabase()
                        console.log("[DB] Database configuration updated and database restarted, verifying...")
                        await bareBonesConnection(mongoConnectionString, res, rej).then(()=>{throw new DatabaseError("Attempt for verifying updated configuration failed.")}).catch(()=>null)
                    } else {
                        showDBSetupInstructions(false)
                        await new Promise(() => {}) // sleep forever
                    }
                }
            }
        } catch (err) {
            console.error(err)
            reject(err)
        }

    })
}

export async function restartDatabase() {
    console.log("[DB] Restarting the database...")
    const util = await import("util")
    const exec = util.promisify((await import('child_process')).exec);
    const restartcommand = process.platform == "linux" ? "sudo systemctl restart mongod" : process.platform == "darwin" ? "brew services restart mongodb-community" : "net stop mongod && net start mongod" // TODO: TEST WINDOWS
    if (!["win32", "darwin", "linux"].includes(process.platform)) {
        console.error("[DB] Unsupported platform.")
        console.error("[DB] Please restart the database manually and then restart QRLink.")
        await new Promise(() => {}) // sleep forever
        return
    }
    console.log("> " + restartcommand)
    await exec(restartcommand).catch(async (err: any) => {
        console.error(err)
        console.error("[DB] An error occurred, please restart the database manually and then restart QRLink.")
        await new Promise(() => {}) // sleep forever
    })
    console.log("[DB] Database restarted.")
    return
}

async function editConfiguration(configLoc: string) {
    const {promises:fs} = await import("fs")
    let config = yaml.parse(await fs.readFile(configLoc, "utf8"))
    if (!config["security"]) {
        config["security"] = {}
    }
    config["security"]["authorization"] = "enabled"
    await fs.writeFile(configLoc, yaml.stringify(config))
    console.log("[DB] Database configuration updated.")
        
}


export async function ensureDBSetup(clientORmCS: MongoClient | string) {
    return new Promise<void>(async (resolve, reject) => {
    let dbClient = clientORmCS ?? null
    if (!(dbClient instanceof MongoClient)) {
        dbClient = null

        if (typeof clientORmCS != "string") return reject("invalid_arg")
        const mongoConnectionString = clientORmCS as string
        dbClient = new MongoClient(mongoConnectionString);
    }
    try {
        const db = dbClient.db("QRLink");
        const collections = (await db.listCollections().toArray()).map((collection) => collection.name);
        if (!collections.includes("qrcodes")) {
            await db.createCollection("qrcodes");
            console.log("[DB] Database and collection setup was successful.")
        } else {
            console.log("[DB] Database and collection are already set up correctly.")
        }
        resolve()
    } catch (err) {
        reject(err)
    } finally {
        if (!clientORmCS) await dbClient.close();
    }
    })
}

function showDBSetupInstructions(isDocker: boolean) {
    console.log()
    console.log()
    console.log("-------")
    console.log("The specified database is not set up correctly to be protected from unauthorized access and is not compatible with QRLink.")
    console.log()
    console.log("Please follow the following steps to set up the database correctly:")
    console.log()
    console.log("1. Edit the configuration file at (Linux: /etc/mongod.conf, Windows: <install directory>\\bin\\mongod.cfg, macOS: /usr/local/etc/mongod.conf) and add the following lines:")
    console.log()
    console.log("security:")
    console.log("  authorization: enabled")
    console.log()
    console.log("2. After editing the configuration file, restart MongoDB.")
    if (isDocker) console.log("3. Restart the Docker container.")
    else console.log("3. Restart the MongoDB service.")
    console.log("-------")
}

export async function readQRCodeTable(storage=global.storageMethod) {
    return new Promise<QRCodeTable>(async (resolve, reject) => {
      if (storage == "file") {
            const {promises:fs} = await import("fs")
            console.log(`[QR] Reading QRCodeTable from '${global.QRBackupFilePath}'...`);
            const data = await fs.readFile(global.QRBackupFilePath, "utf8");
          resolve(parseJSONC(data));
      } else {
          try {
                console.log("[DB] Reading QRCodeTable from the database...")
              let results: Array<MongoQRCodeInformation> = await global.mongoClient.db("QRLink").collection("qrcodes").find({}).toArray() as unknown as Array<MongoQRCodeInformation>
              resolve(await convertToQRCTFormat(results))
          } catch (err) {
              reject(err)
          }
      }
    });
  }
export async function saveQR(id: string = null, obj: QRCodeInformation | object = {}, update:boolean=false) {
    return new Promise<void>(async (resolve, reject) => {
        if (global.storageMethod == "file") {
            console.log(`[QR] Saving QRCodeTable to '${global.QRBackupFilePath}'...`);
            const {promises:fs} = await import("fs")
            await fs.writeFile(
                global.QRBackupFilePath,
                JSON.stringify(global.QRCodeTable, null, 2)
               );
            resolve()
        } else {
            if (update) {
                console.log("[DB] Updating QR-code " + id + " in the database...")
                global.mongoClient.db("QRLink").collection("qrcodes").updateOne({id: id}, {$set: obj}).then((status) => {
                    if (status.modifiedCount == 0) {
                        console.log("[DB] Failed to update QR-code " + id + " in the database.")
                    }
                    resolve()
                })
            } else {
                console.log("[DB] Inserting QR-code " + id + " into the database...");
                (obj as MongoQRCodeInformation).id = id 
                global.mongoClient.db("QRLink").collection("qrcodes").insertOne(obj).then((status) => {
                    if (!status.acknowledged) {
                        console.log("[DB] Failed to insert QR-code " + id + " into the database.")
                    }
                    resolve()
                })
            }
            resolve()
        }
  });

}

export async function convertFile2MongoDB() {
    if (global.storageMethod == "file") return
    let fileData: QRCodeTable = await readQRCodeTable("file")
    let mongoData: QRCodeTable = global.QRCodeTable
    let keysFile = Object.keys(fileData)
    let keysMongo = Object.keys(mongoData)
    // check which keys are not in the mongoDB
    let keysNotInMongo = keysFile.filter((key) => !keysMongo.includes(key))

    let dataToInsert = keysNotInMongo.map((key) => {
        let data = fileData[key] as QRCodeInformation
        let id = key
        return {
            id: id,
            ...data
        }
    })

    if (dataToInsert.length != 0) {
        await global.mongoClient.db("QRLink").collection("qrcodes").insertMany(dataToInsert)
        console.log("[DB] " + dataToInsert.length + " QR-codes were converted from file storage to MongoDB.")
    }
}

export async function convertToQRCTFormat(data: Array<MongoQRCodeInformation>): Promise<QRCodeTable> {
    return new Promise<QRCodeTable>((resolve, reject) => {
        let result: QRCodeTable = {}
        for (let qrCode of data) {
            let id = qrCode.id
            delete qrCode.id
            delete qrCode._id
            result[id] = qrCode
        }
        resolve(result)
    })
}

