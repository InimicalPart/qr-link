import yaml from "yaml"
import { MongoClient, MongoError, MongoServerError, MongoServerSelectionError } from "mongodb";
import { randomString } from "./misc";
import { MongoQRCodeInformation, QRCodeTable } from "@/types/api/v1/QRCode";
import { parse as parseJSONC } from "jsonc-parser"; //! JSONC to support comments in JSON files, for readability
import { QRLinkGlobal } from "@/types/api/v1/global";
import { QRCode } from "./qrcode";
declare const global: QRLinkGlobal

export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DatabaseError";
    }
}

/**
 * Attempts to connect to the database without credentials and then sets up the database to be protected from unauthorized access.
 * @param mongoConnectionString The connection string to the MongoDB database.
 * @param res A function to call when the connection is successful.
 * @param rej A function to call when the connection fails, with a reason as the first argument.
 * @returns A promise that resolves when the connection is successful and rejects when the connection fails.
 */
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
                console.log(`[DATA] The database at ${process.env.MONGO_URL} is not accessible without credentials (which is expected).`)
                await client.close()
                if (rej) rej("creds_req")
                return reject("creds_req")
            } else if (succeeded instanceof MongoServerSelectionError) {
                console.log("[DATA] The database at " + process.env.MONGO_URL + " is not accessible.")
                await client.close()
                if (rej) rej("not_accessible")
                return reject("not_accessible")
            } else if (succeeded instanceof MongoError) {
              console.log("[DATA] Encountered an error while attempting to connect to the database:")
              console.error(succeeded)
              await client.close()
                if (rej) rej("error")
              return reject("error")
          }
            console.log(`[DATA] Warning: The database at ${process.env.MONGO_URL} is accessible without credentials. We will now attempt to configure the database to be protected from unauthorized access.`)

            // Create account for QRLink
            const authenticatingDatabase = client.db("admin")
            await authenticatingDatabase.command({createUser: process.env.MONGO_USERNAME, pwd: process.env.MONGO_PASSWORD, roles: [{role: "readWrite", db: "QRLink"}]}).then(()=>{
                console.log(`[DATA] Created user '${process.env.MONGO_USERNAME}' with password '${process.env.MONGO_PASSWORD}' in the database 'admin'.`)
            }).catch((err) => {
                if (err.code == 51003) {
                    console.log(`[DATA] User '${process.env.MONGO_USERNAME}' already exists in the database 'admin'.`)
                } else console.error(err)
            })
            // Create root user 
            let rootUserPasswd = await randomString(32)
            await authenticatingDatabase.command({createUser: "root", pwd: rootUserPasswd, roles: ["root"]}).then(()=>{
                console.log(`[DATA] Created user 'root' with password '${rootUserPasswd}' in the database 'admin'. SAVE THIS PASSWORD!`)
            }).catch((err) => {
                if (err.code == 51003) {
                    console.log(`[DATA] User 'root' already exists in the database 'admin'.`)
                } else console.error(err)
            })
            await ensureDBSetup(client)
            await client.close()

            const isOpen = await fetch(process.env.MONGO_API_PROTOCOL + "://" + (process.env.MONGO_URL.includes(":") ? process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") : process.env.MONGO_URL+":3010") + "/test").then((res) => res.ok).catch((err) => false)
            if (isOpen) {
                // DOCKER:DOCKER
                console.log("[DATA] QRLink has detected that the database has the QRL API enabled. Attempting to configure the database to be protected from unauthorized access...")
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
                    console.log("[DATA] Updated database configuration.")
                    console.log("[DATA] Requesting database restart...")
                    await fetch(process.env.MONGO_API_PROTOCOL + "://" + (process.env.MONGO_URL.includes(":") ? process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") : process.env.MONGO_URL+":3010") + "/mongodb/restart", {
                        method: "POST"
                    }).then((res) => res.json()).catch((err) => console.error(err))
                    console.log("[DATA] Database restart completed.")
                    resolve()
                } else {
                    console.warn("[DATA] Failed to fetch database configuration.")
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
                        console.log("[DATA] QRLink has detected that the database is running on the same machine as this program, but the database is not set up correctly to be protected from unauthorized access and is not compatible with QRLink.")
                        console.log("[DATA] In 10 seconds, the program will automatically make the necessary changes to the database configuration and restart the database.")
                        console.log("[DATA] To cancel this process, press CTRL+C now.")
                        await new Promise((resolve) => setTimeout(resolve, 10000))
                        console.log("[DATA]")
                        console.log("[DATA]")
                        console.log("[DATA] Making changes to the database configuration...")
                        console.log("[DATA]")
                        if (process.platform == "linux") {
                            const {promises:fs} = await import("fs")
                            try {
                                await fs.access(configLoc, fs.constants.W_OK)
                            } catch {
                                // get current file owner
                                const currentFileOwner = (child_process.spawnSync("ls",["-la", configLoc])).stdout.toString().split(" ")[2]
                                console.log("[DATA] User '" + process.env.USER + "' does not have write permissions to the configuration file at " + configLoc + ".")
                                console.log("[DATA] QRLink can temporarily add write permissions for user '" + process.env.USER + "' to the configuration file at " + configLoc + " automatically.")
                                console.log("[DATA]")
                                console.log("[DATA] QRLink will do the following:")
                                console.log("[DATA]     1. Give user '" + process.env.USER + "' ownership of the configuration file at " + configLoc + ".")
                                console.log("[DATA]     2. Add 'security.authorization = enabled' to the configuration file at " + configLoc + ".")
                                console.log("[DATA]     3. Return ownership of the configuration file at " + configLoc + " to '" + currentFileOwner + "' (current file owner).")
                                console.log("[DATA]     4. Restart the database.")
                                console.log("[DATA]")
                                const readline = (await import('readline')).createInterface({
                                    input: process.stdin,
                                    output: process.stdout
                                })
                                const answer = await new Promise<string>(resolve => {
                                    readline.question("[DATA] Would you like to proceed? (y/n) ", resolve)
                                  })

                                if (answer.toLowerCase() == "y") {
                                    readline.close()
                                    console.log("[DATA] Configurating...")
                                    console.log("[-SH-] > sudo chown " + process.env.USER + " " + configLoc)
                                    child_process.execSync("sudo chown " + process.env.USER + " " + configLoc)
                                    await editConfiguration(configLoc)
                                    console.log("[-SH-] > sudo chown " + currentFileOwner + " " + configLoc)
                                    child_process.execSync("sudo chown " + currentFileOwner + " " + configLoc)
                                    await restartDatabase()
                                    
                                    console.log("[DATA] Database configuration updated and database restarted, verifying...")
                                    await bareBonesConnection(mongoConnectionString, res, rej).then(()=>{throw new DatabaseError("Attempt for verifying updated configuration failed.")}).catch(()=>null)

                                } else {
                                    console.log("[DATA] The database will not be set up correctly and QRLink will not work.")
                                    readline.close()
                                    showDBSetupInstructions(false)
                                    await new Promise(() => {}) // sleep forever
                                }
                            }
                        }
                        await editConfiguration(configLoc)
                        await restartDatabase()
                        console.log("[DATA] Database configuration updated and database restarted, verifying...")
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

/**
 * Restarts the database.
 * If it fails, it will print an error message and then sleep forever.
 */
export async function restartDatabase() {
    console.log("[DATA] Restarting the database...")
    const util = await import("util")
    const exec = util.promisify((await import('child_process')).exec);
    const restartcommand = process.platform == "linux" ? "sudo systemctl restart mongod" : process.platform == "darwin" ? "brew services restart mongodb-community" : "net stop mongod && net start mongod" // TODO: TEST WINDOWS
    if (!["win32", "darwin", "linux"].includes(process.platform)) {
        console.error("[DATA] Unsupported platform.")
        console.error("[DATA] Please restart the database manually and then restart QRLink.")
        await new Promise(() => {}) // sleep forever
        return
    }
    console.log("[-SH-] > " + restartcommand)
    await exec(restartcommand).catch(async (err: any) => {
        console.error(err)
        console.error("[DATA] An error occurred, please restart the database manually and then restart QRLink.")
        await new Promise(() => {}) // sleep forever
    })
    console.log("[DATA] Database restarted.")
}

/**
 * Edits the database configuration file to force authorization.
 * @param configLoc The location of the configuration file.
 */
async function editConfiguration(configLoc: string) {
    const {promises:fs} = await import("fs")
    let config = yaml.parse(await fs.readFile(configLoc, "utf8"))
    if (!config["security"]) {
        config["security"] = {}
    }
    config["security"]["authorization"] = "enabled"
    await fs.writeFile(configLoc, yaml.stringify(config))
    console.log("[DATA] Database configuration updated.")
        
}


/**
 * Makes sure the database has the correct databases and collections, and creates them if they don't exist.
 * @param clientORmCS The MongoClient object or the connection string to the MongoDB database.
 */
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
        if (!collections.includes("qrcodes") || !collections.includes("apikeys")) {
            await db.createCollection("qrcodes");
            await db.createCollection("apikeys");
            console.log("[DATA] Database and collection setup was successful.")
        } else {
            console.log("[DATA] Database and collection are already set up correctly.")
        }
        resolve()
    } catch (err) {
        reject(err)
    } finally {
        if (!clientORmCS) await dbClient.close();
    }
    })
}

/**
 * Shows the user how to set up the database correctly.
 * @param isDocker Whether the database is running in a Docker container.
 */
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

/**
 * Reads the QRCodeTable from the database or file.
 * @param storage The storage method to use. "file" for file storage, "mongo" for database storage.
 * @returns A promise that resolves with the QRCodeTable.
 */
export async function readQRCodeTable(storage=global.storageMethod) {
    return new Promise<QRCodeTable>(async (resolve, reject) => {
      if (storage == "file") {
            const {promises:fs} = await import("fs")
            console.log(`[DATA] Reading QRCodeTable from '${global.QRBackupFilePath}'...`);
            const data = await fs.readFile(global.QRBackupFilePath, "utf8");
            const parsed = parseJSONC(data) 
            const classed = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, new QRCode({...(value as QRCode), id: key})])) as QRCodeTable // Convert QRCode from object to class
            resolve(classed);
      } else {
          try {
                console.log("[DATA] Reading QRCodeTable from the database...")
              let results: Array<MongoQRCodeInformation> = await global.mongoClient.db("QRLink").collection("qrcodes").find({}).toArray() as unknown as Array<MongoQRCodeInformation>
            

                //! Make sure to convert the dates to ISO strings, if any are present
                results = results.map((obj)=>{
                    if ((obj.created as unknown as any) instanceof Date) obj.created = (obj.created as unknown as any).toISOString()
                    if ((obj.updated as unknown as any) instanceof Date) obj.updated = (obj.updated as unknown as any).toISOString()
                    if ((obj.expires as unknown as any) instanceof Date) obj.expires = (obj.expires as unknown as any).toISOString()
                    //loop through scanData
                    if (obj.scanData) {
                        obj.scanData = obj.scanData.map((scan) => {
                            if ((scan as unknown as any).date instanceof Date) (scan as any).date = ((scan as any).date as unknown as any).toISOString()
                            return scan
                        })                
                    }
                    //loop through updateLog
                    if (obj.update_log) {
                        obj.update_log = obj?.update_log?.map((update) => {
                            if ((update as unknown as any).date instanceof Date) (update as any).date = ((update as any).date as unknown as any).toISOString()
                            return update
                        })
                    }
                    return obj
                })
              
                          
              
              resolve(await convertToQRCTFormat(results))
          } catch (err) {
              reject(err)
          }
      }
    });
  }

/**
 * Deletes the QRCode with the specified ID from the database or file.
 * @param id The ID of the QRCode to delete.
 */
export async function deleteQR(id: string) {
    return new Promise<void>(async (resolve, reject) => {
        if (global.storageMethod == "file") {
            if (global.debugMode) console.log(`[QR] Deleting QRCodeTable entry '${id}' from '${global.QRBackupFilePath}'...`);
            const {promises:fs} = await import("fs")
            let data = await readQRCodeTable("file")
            delete data[id]
            await fs.writeFile(global.QRBackupFilePath, JSON.stringify((Object.keys(data).map((key)=>Object.assign({}, data[key])))) // Convert QRCode from class to object
            );
            resolve()
        } else {
            if (global.debugMode) console.log("[DATA] Deleting QR-code " + id + " from the database...")
            global.mongoClient.db("QRLink").collection("qrcodes").deleteOne({id: id}).then((status) => {
                if (status.deletedCount == 0) {
                    console.log("[DATA] Failed to delete QR-code " + id + " from the database.")
                }
                resolve()
            })
        }
    });
}

/**
 * Reads the APIKeys from the database or file.
 * @returns A promise that resolves with the APIKeys.
 */
export async function getAPIKeys(storage=global.storageMethod) {
    return new Promise<APIKeys>(async (resolve, reject) => {
        if (storage == "file") {
            if (global.debugMode) console.log(`[DATA] Reading APIKeys from '${global.APIBackupFilePath}'...`);
            const {promises:fs} = await import("fs")
            const data = await fs.readFile(global.APIBackupFilePath, "utf8");
            const parsed = parseJSONC(data)
            resolve(parsed);
        } else {
            if (global.debugMode) console.log("[DATA] Reading APIKeys from the database...")
            global.mongoClient.db("QRLink").collection("apikeys").find({}).toArray().then((results) => {
                resolve(results.reduce((acc:{
                    [key:string]: any
                }, cur) => {
                    acc[cur.id] = cur
                    delete acc[cur.id]._id
                    delete acc[cur.id].id
                    return acc
                }, {}))
            })
        }
    });
}

/**
 * Creates an API key.
 * @param name The name of the API key.
 * @param owner The owner of the API key.
 * @param permissions The permissions of the API key.
 * @returns A promise that resolves with the ID and the API key.
 */
export async function createAPIKey(name: string, owner: string, permissions: Array<APIKeyPermissions>) {
    //make sure id doesnt already exist, Object.keys(global.APIKeys)
    let id = await randomString(32)
    while (Object.keys(global.APIKeyTable).includes(id)) {
        id = await randomString(32)
    }
    let key = await randomString(64)
    global.APIKeyTable[id] = {
        key: key,
        name: name,
        belongs_to: owner,
        created: new Date().toISOString(),
        last_used: null,
        permissions: permissions
    }

    if (global.storageMethod == "file") {
        if (global.debugMode) console.log(`[DATA] Saving APIKeys to '${global.APIBackupFilePath}'...`);
        const {promises:fs} = await import("fs")
        await fs.writeFile(global.APIBackupFilePath, JSON.stringify(global.APIKeyTable));
    } else {
        if (global.debugMode) console.log("[DATA] Inserting APIKey " + id + " into the database...");
        global.mongoClient.db("QRLink").collection("apikeys").insertOne({
            id: id,
            ...global.APIKeyTable[id]
        })
    }

    return {id, ...global.APIKeyTable[id]}
}

/**
 * Deletes the API key with the specified ID from the database or file.
 * @param id The ID of the API key to delete.
 */
export async function deleteAPIKey(id: string) {
    const copy = {...global.APIKeyTable[id]}
    delete global.APIKeyTable[id]
    if (global.storageMethod == "file") {
        if (global.debugMode) console.log(`[DATA] Deleting APIKey '${id}' from '${global.APIBackupFilePath}'...`);
        const {promises:fs} = await import("fs")
        await fs.writeFile(global.APIBackupFilePath, JSON.stringify(global.APIKeyTable));
    } else {
        if (global.debugMode) console.log("[DATA] Deleting APIKey " + id + " from the database...")
        global.mongoClient.db("QRLink").collection("apikeys").deleteOne({id: id})
    }
    return copy
}

/**
 * Updates the name of the API key with the specified ID.
 * @param id The ID of the API key to update.
 * @param name The new name of the API key.
 */
export async function updateAPIKeyName(id: string, name: string) {
    //! You will only be able to update the name of the API key, nothing else.
    global.APIKeyTable[id].name = name
    if (global.storageMethod == "file") {
        if (global.debugMode) console.log(`[DATA] Updating APIKey '${id}' in '${global.APIBackupFilePath}'...`);
        const {promises:fs} = await import("fs")
        await fs.writeFile(global.APIBackupFilePath, JSON.stringify(global.APIKeyTable));
    } else {
        if (global.debugMode) console.log("[DATA] Updating APIKey " + id + " in the database...")
        global.mongoClient.db("QRLink").collection("apikeys").updateOne({id: id}, {$set: {name: name}})
    }
    return true
} 

/**
 * Saves a QRCode to the database or file.
 * @param id The ID of the QRCode to save.
 * @param obj The QRCode to save.
 * @param update Whether to update the QRCode or insert a new one.
 * @returns A promise that resolves when the QRCode is saved.
 */
export async function saveQR(id: string = null, obj: QRCode = new QRCode(), update:boolean=false) {
    return new Promise<void>(async (resolve, reject) => {
        if (global.storageMethod == "file") {
            if (global.debugMode) console.log(`[QR] Saving QRCodeTable to '${global.QRBackupFilePath}'...`);
            const {promises:fs} = await import("fs")
            await fs.writeFile(
                global.QRBackupFilePath,
                JSON.stringify((Object.keys(global.QRCodeTable).map((key)=>{
                
                    let objectified = Object.assign({}, global.QRCodeTable[key])
                    if ((objectified.created as unknown as any) instanceof Date) objectified.created = (objectified.created as unknown as any).toISOString()
                    if ((objectified.updated as unknown as any) instanceof Date) objectified.updated = (objectified.updated as unknown as any).toISOString()
                    if ((objectified.expires as unknown as any) instanceof Date) objectified.expires = (objectified.expires as unknown as any).toISOString()
                    //loop through scanData
                    objectified.scanData = objectified.scanData.map((scan) => {
                        if ((scan as unknown as any).date instanceof Date) (scan as any).date = ((scan as any).date as unknown as any).toISOString()
                        return scan
                    })

                    //loop through updateLog
                    objectified.update_log = objectified.update_log.map((update) => {
                        if ((update as unknown as any).date instanceof Date) (update as any).date = ((update as any).date as unknown as any).toISOString()
                        return update
                    })

                    return objectified
                
                }))) // Convert QRCode from class to object
               );
            resolve()
        } else {
            if (update) {
                if (global.debugMode) console.log("[DATA] Updating QR-code " + id + " in the database...")
                global.mongoClient.db("QRLink").collection("qrcodes").updateOne({id: id}, {$set: (()=>{
                    let objectified = Object.assign({},obj)
                    if ((objectified.created as unknown as any) instanceof Date) objectified.created = (objectified.created as unknown as any).toISOString()
                    if ((objectified.updated as unknown as any) instanceof Date) objectified.updated = (objectified.updated as unknown as any).toISOString()
                    if ((objectified.expires as unknown as any) instanceof Date) objectified.expires = (objectified.expires as unknown as any).toISOString()
                    //loop through scanData
                    objectified.scanData = objectified.scanData.map((scan) => {
                        if ((scan as unknown as any).date instanceof Date) (scan as any).date = ((scan as any).date as unknown as any).toISOString()
                        return scan
                    })

                    //loop through updateLog
                    objectified.update_log = objectified.update_log.map((update) => {
                        if ((update as unknown as any).date instanceof Date) (update as any).date = ((update as any).date as unknown as any).toISOString()
                        return update
                    })

                    return objectified
                })()}).then((status) => {
                    if (status.modifiedCount == 0) {
                        console.log("[DATA] Failed to update QR-code " + id + " in the database.")
                    }
                    resolve()
                })
            } else {
                if (global.debugMode) console.log("[DATA] Inserting QR-code " + id + " into the database...");
                (obj as MongoQRCodeInformation).id = id 
                global.mongoClient.db("QRLink").collection("qrcodes").insertOne((()=>{
                    let objectified = Object.assign({},obj)
                    
                    if ((objectified.created as unknown as any) instanceof Date) objectified.created = (objectified.created as unknown as any).toISOString()
                    if ((objectified.updated as unknown as any) instanceof Date) objectified.updated = (objectified.updated as unknown as any).toISOString()
                    if ((objectified.expires as unknown as any) instanceof Date) objectified.expires = (objectified.expires as unknown as any).toISOString()
                    //loop through scanData
                    objectified.scanData = objectified.scanData.map((scan) => {
                        if ((scan as unknown as any).date instanceof Date) (scan as any).date = ((scan as any).date as unknown as any).toISOString()
                        return scan
                    })

                    //loop through updateLog
                    objectified.update_log = objectified.update_log.map((update) => {
                        if ((update as unknown as any).date instanceof Date) (update as any).date = ((update as any).date as unknown as any).toISOString()
                        return update
                    })

                    return objectified
                })()).then((status) => {
                    if (!status.acknowledged) {
                        console.log("[DATA] Failed to insert QR-code " + id + " into the database.")
                    }
                    resolve()
                })
            }
            resolve()
        }
  });

}

/**
 * Synchronizes the MongoDB with the file storage method.
 * Essentially, this function will insert all QR-codes & API-keys from the file storage method into the MongoDB.
 * @returns A promise that resolves when the synchronization is complete.
 */
export async function syncMongoWithFile() {
    if (global.storageMethod == "file") return
    //! QR-codes
    let fileDataQR: QRCodeTable = await readQRCodeTable("file")
    let mongoDataQR: QRCodeTable = global.QRCodeTable
    let keysFileQR = Object.keys(fileDataQR)
    let keysMongoQR = Object.keys(mongoDataQR)

    //! API-keys
    let fileDataAPI: APIKeys = await getAPIKeys("file")
    let mongoDataAPI: APIKeys = global.APIKeyTable
    let keysFileAPI = Object.keys(fileDataAPI)
    let keysMongoAPI = Object.keys(mongoDataAPI)
    
    // check which keys are not in the mongoDB
    let QRkeysNotInMongo = keysFileQR.filter((key) => !keysMongoQR.includes(key))
    let APIkeysNotInMongo = keysFileAPI.filter((key) => !keysMongoAPI.includes(key))

    let QRsToInsert = QRkeysNotInMongo.map((key) => {
        let data = fileDataQR[key] as QRCode
        let id = key
        return {
            id: id,
            ...data
        }
    })

    let APIKeysToInsert = APIkeysNotInMongo.map((key) => {
        let data = fileDataAPI[key]
        let id = key
        return {
            id: id,
            ...data
        }
    })


    if (QRsToInsert.length != 0) {
        await global.mongoClient.db("QRLink").collection("qrcodes").insertMany(QRsToInsert)
        console.log("[DATA] " + QRsToInsert.length + " QR-codes were converted from file storage to MongoDB.")
    }
    if (APIKeysToInsert.length != 0) {
        await global.mongoClient.db("QRLink").collection("apikeys").insertMany(APIKeysToInsert)
        console.log("[DATA] " + APIKeysToInsert.length + " API-keys were converted from file storage to MongoDB.")
    }
}

/**
 * Converts from MongoDB format to QRCodeTable format.
 * @param data An array of QRCode objects in MongoDB format.
 * @returns A promise that resolves with the QRCodeTable format.
 */
export async function convertToQRCTFormat(data: Array<MongoQRCodeInformation>): Promise<QRCodeTable> {
    return new Promise<QRCodeTable>((resolve, reject) => {
        let result: QRCodeTable = {}
        for (let qrCode of data) {
            delete qrCode._id
            result[qrCode.id] = new QRCode(qrCode)
        }
        resolve(result)
    })
}

