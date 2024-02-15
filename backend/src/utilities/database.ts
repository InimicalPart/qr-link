import yaml from "yaml"
import fs from "fs"
import { MongoClient, MongoError, MongoServerError, MongoServerSelectionError } from "mongodb";
import { randomString } from "./misc";
import { MongoQRCodeInformation, QRCodeInformation, QRCodeTable } from "../types/QRCode";
import { parse as parseJSONC } from "jsonc-parser"; //! JSONC to support comments in JSON files, for readability

export async function bareBonesConnection(mongoConnectionString: string) {
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
                return reject("creds_req")
            } else if (succeeded instanceof MongoServerSelectionError) {
                console.log("[DB] The database at " + process.env.MONGO_URL + " is not accessible.")
                await client.close()
                return reject("not_accessible")
            } else if (succeeded instanceof MongoError) {
              console.log("[DB] Encountered an error while attempting to connect to the database:")
              console.error(succeeded)
              await client.close()
              return reject("error")
          }
            console.log(`[DB] Warning: The database at ${process.env.MONGO_URL} is accessible without credentials. We will now attempt to configure the database to be protected from unauthorized access.`)

            // Create account for QRLink
            const authenticatingDatabase = client.db("admin")
            authenticatingDatabase.command({createUser: process.env.MONGO_USERNAME, pwd: process.env.MONGO_PASSWORD, roles: [{role: "readWrite", db: "QRLink"}]})
            console.log(`[DB] Created user ${process.env.MONGO_USERNAME} with password ${process.env.MONGO_PASSWORD} in the database 'admin'.`)
            // Create root user 
            let rootUserPasswd = await randomString(32)
            authenticatingDatabase.command({createUser: "root", pwd: rootUserPasswd, roles: ["root"]})
            console.log(`[DB] Created user root with password ${rootUserPasswd} in the database 'admin'. SAVE THIS PASSWORD!`)
            await ensureDBSetup(client)
            await client.close()

            const isOpen = await fetch(process.env.MONGO_API_PROTOCOL + "://" + process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") + "/test").then((res) => res.ok).catch((err) => false)
            if (isOpen) {
                // DOCKER:DOCKER
                console.log("[DB] QRLink has detected that the database has the QRL API enabled. Attempting to configure the database to be protected from unauthorized access...")
                const currentDBConfig = await fetch(process.env.MONGO_API_PROTOCOL + "://" + process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") + "/mongodb/config").then((res) => res.json()).catch((err) => null)
                if (currentDBConfig) {
                    if (!currentDBConfig["security"]) {
                        currentDBConfig["security"] = {}
                    }
                    currentDBConfig["security"]["authorization"] = "enabled"
                    await fetch(process.env.MONGO_API_PROTOCOL + "://" + process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") + "/mongodb/config", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(currentDBConfig)
                    }).then((res) => res.json()).catch((err) => console.error(err))
                    console.log("[DB] Updated database configuration.")
                    console.log("[DB] Requesting database restart...")
                    await fetch(process.env.MONGO_API_PROTOCOL + "://" + process.env.MONGO_URL.replace(/:[0-9]{1,5}/g, ":3010") + "/mongodb/restart", {
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
                    process.on("SIGTERM", () => {
                        process.exit(0)
                    })
                    process.on("SIGINT", () => {
                        process.exit(0)
                    })
                    await new Promise(() => {}) // sleep forever
                } else {
                    // LOCAL:LOCAL
                    
                    // check if connection URL is localhost/127.0.0.1/::1/etc.
                    if (/(localhost|::1|127\.0\.0\.1):[0-9]{1,5}/g.test(process.env.MONGO_URL)) {
                        if (process.platform == "win32") {
                            showDBSetupInstructions(false)
                            process.on("SIGTERM", () => {
                                process.exit(0)
                            })
                            process.on("SIGINT", () => {
                                process.exit(0)
                            })
                            await new Promise(() => {}) // sleep forever
                        }
                        console.log("[DB] QRLink has detected that the database is running on the same machine as this program, but the database is not set up correctly to be protected from unauthorized access and is not compatible with QRLink.")
                        console.log("[DB] In 10 seconds, the program will automatically make the necessary changes to the database configuration and restart the database.")
                        console.log("[DB] To cancel this process, press CTRL+C now.")
                        await new Promise((resolve) => setTimeout(resolve, 10000))
                        console.log("[DB] Making changes to the database configuration...")
                        const configLoc = process.platform == "linux" ? "/etc/mongod.conf" : process.platform == "darwin" ? "/usr/local/etc/mongod.conf" : "" // TODO: Add Windows support
                        if (configLoc == "") {
                            console.error("Failed to find the configuration file for the database.")
                            showDBSetupInstructions(false)
                            process.on("SIGTERM", () => {
                                process.exit(0)
                            })
                            process.on("SIGINT", () => {
                                process.exit(0)
                            })
                            await new Promise(() => {}) // sleep forever
                        } else {
                            let config = yaml.parse(fs.readFileSync(configLoc, "utf8"))
                            if (!config["security"]) {
                                config["security"] = {}
                            }
                            config["security"]["authorization"] = "enabled"
                            fs.writeFileSync(configLoc, yaml.stringify(config))
                            console.log("Database configuration updated.")

                            console.log("Restarting the database...")
                            if (process.platform == "linux") {
                                const { exec } = require('child_process');
                                exec('sudo systemctl restart mongod', (err, stdout, stderr) => {
                                    if (err) {
                                        console.error(err);
                                        showDBSetupInstructions(false)
                                        process.on("SIGTERM", () => {
                                            process.exit(0)
                                        })
                                        process.on("SIGINT", () => {
                                            process.exit(0)
                                        })
                                        return
                                    }
                                    console.log("Database restarted.")
                                    resolve()
                                });
                            } else if (process.platform == "darwin") {
                                const { exec } = require('child_process');
                                exec('brew services restart mongodb-community', (err, stdout, stderr) => {
                                    if (err) {
                                        console.error(err);
                                        showDBSetupInstructions(false)
                                        process.on("SIGTERM", () => {
                                            process.exit(0)
                                        })
                                        process.on("SIGINT", () => {
                                            process.exit(0)
                                        })
                                        return
                                    }
                                    console.log("Database restarted.")
                                    resolve()
                                });
                            } else if (process.platform == "win32") {
                                const { exec } = require('child_process');
                                exec('net stop mongod && net start mongod', (err, stdout, stderr) => { // TODO: TEST
                                    if (err) {
                                        console.error(err);
                                        showDBSetupInstructions(false)
                                        process.on("SIGTERM", () => {
                                            process.exit(0)
                                        })
                                        process.on("SIGINT", () => {
                                            process.exit(0)
                                        })
                                        return
                                    }
                                    console.log("Database restarted.")
                                    resolve()
                                });
                            }

                        }

                    } else {
                        showDBSetupInstructions(false)
                        process.on("SIGTERM", () => {
                            process.exit(0)
                        })
                        process.on("SIGINT", () => {
                            process.exit(0)
                        })
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
            console.log("[DB] Database setup was successful.")
        } else {
            console.log("[DB] Database is already set up correctly.")
        }
        resolve()
    } catch (err) {
        reject(err)
    } finally {
        if (!clientORmCS) await dbClient.close();
    }
    })
}

function showDBSetupInstructions(isDocker) {
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
          fs.readFile("./resources/qrcodes.jsonc", "utf8", (err, data) => {
              if (err) {
                  reject(err);
              }
              resolve(parseJSONC(data));
          });
      } else {
          try {
              let results: Array<MongoQRCodeInformation> = await global.mongoClient.db("QRLink").collection("qrcodes").find({}).toArray() as unknown as Array<MongoQRCodeInformation>
              resolve(await convertToQRCTFormat(results))
          } catch (err) {
              reject(err)
          }
      }
    });
  }
export async function saveQR(id: string = null, obj: QRCodeInformation | object = {}, update:boolean=false) {
    return new Promise<void>((resolve, reject) => {
        if (global.storageMethod == "file") {
            console.log("[QR] Saving QRCodeTable to resources/qrcodes.jsonc...");
            fs.writeFile(
                "./resources/qrcodes.jsonc",
                JSON.stringify(global.QRCodeTable, null, 2),
                (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                }
               );
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
                console.log("[DB] Inserting QR-code " + id + " into the database...")
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
    let mongoData: QRCodeTable = await readQRCodeTable("mongo")
    let keysFile = Object.keys(fileData)
    let keysMongo = Object.keys(mongoData)
    // check which keys are not in the mongoDB
    let keysNotInMongo = keysFile.filter((key) => !keysMongo.includes(key))

    let dataToInsert = keysNotInMongo.map((key) => {
        let data = fileData[key]
        let id = key
        delete data["id"]
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
            result[id] = qrCode
        }
        resolve(result)
    })
}

