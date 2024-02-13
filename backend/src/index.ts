import express from "express";
import cors from "cors";
import { parse as parseJSONC } from "jsonc-parser"; //! JSONC to support comments in JSON files, for readability
import fs from "fs";
import path from "path";
import moment from "moment-timezone";
import puppeteer from "puppeteer";
import {config} from "dotenv";
import { jwtVerify } from "jose";
import crypto from "crypto";
import QRCodeGenerator from "qrcode";
import WorkOS from "@workos-inc/node";
import {MongoClient, MongoError, MongoServerError, MongoServerSelectionError} from "mongodb";
import yaml from "yaml";
config();
const secret = new Uint8Array(Buffer.from(process.env.JWT_SECRET, "base64"));
const workos = new WorkOS(process.env.WORKOS_API_KEY);
// variables not to be changed
const supportedTypes = ["redirect"];
const mongoConnectionString = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_URL}/${process.env.MONGO_ENABLE_TLS ? "?tls=true" : ""}`; //TODO: enable TLS
let mongoClient: MongoClient | null = null
console.log("[DQ] DynamicQR is starting up...");

(async () => {
let storageMethod = "file";
// Check if the database is accessible
if (process.env.MONGO_URL && process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
    console.log("[DQ] Attempting to connect to the database at " + process.env.MONGO_URL + " (barebones)...");
    await bareBonesConnection(mongoConnectionString).catch(async (information) => {
        if (information == "not_accessible") {
          console.log("[DQ] Failed to connect to the database at " + process.env.MONGO_URL + ". Using file storage method.")
          return false
        } else if (information == "creds_req") {
          try {

            console.log("[DQ] Attempting to connect to the database with credentials...");
            // Attempt to connect using valid credentials
            const client = new MongoClient(mongoConnectionString, {
                serverSelectionTimeoutMS: 1000,
                connectTimeoutMS: 1000
            });
            
            const succeeded = await client.db().admin().listDatabases().catch((a) => a).then((a) => a)

            if (succeeded instanceof MongoError) {
                console.error(succeeded)
                console.log("[DQ] Failed to connect to the database at " + process.env.MONGO_URL + ". Using file storage method.")
                return false
            }

            
            console.log(`[DB] Successfully connected, checking if the database is set up correctly...`)
            await ensureDBSetup(client)
            console.log(`[DQ] Connection to the database at ${process.env.MONGO_URL} was established. Switching storage method to 'mongo'.`)
            storageMethod = "mongo"
            mongoClient = client
            return true
        } catch (e) {
            console.error(e)
            console.log(`[DQ] Failed to connect to the database at ${process.env.MONGO_URL}. Using file storage method.`)
            return false
        }
      }
    })
}
const QRCodeTable: QRCodeTable = await readQRCodeTable()

async function bareBonesConnection(mongoConnectionString: string) {
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

            // Create account for DynamicQR
            const authenticatingDatabase = client.db("admin")
            authenticatingDatabase.command({createUser: process.env.MONGO_USERNAME, pwd: process.env.MONGO_PASSWORD, roles: [{role: "readWrite", db: "DynamicQR"}]})
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
                console.log("[DB] DynamicQR has detected that the database has the DQR API enabled. Attempting to configure the database to be protected from unauthorized access...")
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
                        console.log("[DB] DynamicQR has detected that the database is running on the same machine as this program, but the database is not set up correctly to be protected from unauthorized access and is not compatible with DynamicQR.")
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

function showDBSetupInstructions(isDocker) {
    console.log()
    console.log()
    console.log("-------")
    console.log("The specified database is not set up correctly to be protected from unauthorized access and is not compatible with DynamicQR.")
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

async function ensureDBSetup(client: MongoClient) {
    return new Promise<void>(async (resolve, reject) => {
    let dbClient = client ?? null
    if (!dbClient)
        dbClient = new MongoClient(mongoConnectionString);
    try {
        const db = dbClient.db("DynamicQR");
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
        if (!client) await dbClient.close();
    }
    })
}

async function convertToQRCTFormat(data: Array<MongoQRCodeInformation>): Promise<QRCodeTable> {
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

async function readQRCodeTable(storage=storageMethod) {
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
            let results: Array<MongoQRCodeInformation> = await mongoClient.db("DynamicQR").collection("qrcodes").find({}).toArray() as unknown as Array<MongoQRCodeInformation>
            resolve(await convertToQRCTFormat(results))
        } catch (err) {
            reject(err)
        }
    }
  });
}

async function convertFile2MongoDB() {
    if (storageMethod == "file") return
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
        await mongoClient.db("DynamicQR").collection("qrcodes").insertMany(dataToInsert)
        console.log("[DB] " + dataToInsert.length + " QR-codes were converted from file storage to MongoDB.")
    }
}


interface QRCodeData {
    redirect_to: string;
    after_expiry: string;
    schedule: {
      monday: {[key:string]:{redirect_to: string, after_expiry: string}}
      tuesday: {[key:string]:{redirect_to: string, after_expiry: string}}
      wednesday: {[key:string]:{redirect_to: string, after_expiry: string}}
      thursday: {[key:string]:{redirect_to: string, after_expiry: string}}
      friday: {[key:string]:{redirect_to: string, after_expiry: string}}
      saturday: {[key:string]:{redirect_to: string, after_expiry: string}}
      sunday: {[key:string]:{redirect_to: string, after_expiry: string}}
      timezone: string;
    }
}
interface QRCodeInformation {
    type: string;
    data: Partial<QRCodeData>;
    update_key: string;
    created: Date;
    updated: Date;
    linked_to: string | null;
    name: string | null;
    description: string | null;
    expires: Date | null;
    scanCount: number;
    scanData: Array<Partial<{
        fingerprint: string;
        "user-agent": string;
        timestamp: Date;
        ip: string;
        location: {
            latitude: number;
            longitude: number;
            accuracy: number;
        }
    }>>
    settings: {
        getScanData: boolean;
        scanData: {
            fingerprint: boolean;
            "user-agent": boolean;
            timestamp: boolean;
            ip: boolean;
            location: boolean;
        },
        requirements: {
            location: boolean; //! Only works if settings.scanData.location and settings.getScanData are both true
        }
    }
  }
interface QRCodeTable {
  [key: string]: QRCodeInformation | MongoQRCodeInformation;
}

interface MongoQRCodeInformation extends QRCodeInformation {
    id: string;
}





await convertFile2MongoDB()

const serverURL = (process.env.API_URL ?? "http://localhost:3000").replace(/:[0-9]{1,5}/g, "")
const port = parseInt((process.env.API_URL ?? "http://localhost:3000").replace(/.*:/g, ""))
const api = express();
//TODO: REMOVE LATER!!
api.use(cors());
api.use(express.json());

async function getUser(token): Promise<{isAuthenticated: boolean, user?: {object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string }}> {
    console.log("[JWT] Verifying token: " + token.substring(0, 10) + "..." + token.substring(token.length - 10, token.length))
    let verifiedToken;
    try {
      verifiedToken = await jwtVerify(token, secret);
    } catch {
      console.log("[JWT] Token is invalid.")
      return { isAuthenticated: false };
    }
  
    console.log("[JWT] Token is valid. User: " + verifiedToken.payload.user.email)
    return {
      isAuthenticated: true,
      user: verifiedToken.payload.user,
    };
  }

  async function resolveID(id: string): Promise<{object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string }> {
    console.log("[JWT] Resolving ID: " + id)
    const res = await workos.userManagement.getUser(id)
    console.log("[JWT] ID resolved: " + res.email)
    return res
  }
  

async function randomString(length: number) {
  return new Promise<string>((resolve, reject) => {
    crypto.randomBytes(length, function (err, buffer) {
      if (err) {
        reject(err);
      }
      resolve(buffer.toString("hex"));
    });
  });
}

async function saveQR(id: string = null, obj: QRCodeInformation | object = {}, update:boolean=false) {
    return new Promise<void>((resolve, reject) => {
        if (storageMethod == "file") {
            console.log("[QR] Saving QRCodeTable to resources/qrcodes.jsonc...");
            fs.writeFile(
                "./resources/qrcodes.jsonc",
                JSON.stringify(QRCodeTable, null, 2),
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
                mongoClient.db("DynamicQR").collection("qrcodes").updateOne({id: id}, {$set: obj}).then((status) => {
                    if (status.modifiedCount == 0) {
                        console.log("[DB] Failed to update QR-code " + id + " in the database.")
                    }
                    resolve()
                })
            } else {
                console.log("[DB] Inserting QR-code " + id + " into the database...")
                mongoClient.db("DynamicQR").collection("qrcodes").insertOne(obj).then((status) => {
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
function getPassedTime(times: string[], timezone: string) {
    if (times.includes("ALL_DAY")) {
        return "ALL_DAY";
    }
    let diffs: number[] = []
    for (let time of times) {
        let nextChange = moment("1970-01-02T" + time).tz(timezone)
        let now = moment("1970-01-02T"+(new Date().toLocaleString("en-us", { hour: "numeric", minute: "numeric", second:"numeric", hour12: false }))).tz(timezone)
        let diff = nextChange.diff(now, "seconds")
        if (diff > 0) diff += 86400 //! not really needed, but eh *shrug*, cant afford for it to break, so better safe than sorry
        diffs.push(diff)
    }
    let diffsCopy = diffs.filter((x) => x <= 0)
    let minDiff = diffs.indexOf(Math.max(...diffsCopy))
    if (minDiff == -1) {
        minDiff = diffs.indexOf(Math.max(...diffs))
    }
    let shouldCurrentlyFollow = times[minDiff]
    return shouldCurrentlyFollow
}

async function checkDataValidity(
  type: string,
  data: any,
  id:string,
  takeAction: boolean = false
): Promise<{ valid: boolean; error?: string; message?: string }> {
    let del = {
        schedule: false,
        redirect_to: false,
        after_expiry: false
    }
  switch (type) {
    case "redirect":
    if (data.schedule && (data.redirect_to || data.after_expiry)) {
        return {
            valid: false,
            error: "NOT_VALID_DATA",
            message: "'schedule' cannot be provided with either 'redirect_to' or 'after_expiry'.",
        };
        }
      for (let key of Object.keys(data)) {
        switch (key) {
          case "redirect_to":
            if (!(typeof (data.redirect_to as any) == "string")) {
              return {
                valid: false,
                error: "INVALID_REDIRECT",
                message: "Redirect URL needs to be a string.",
              };
            }
            // If schedule exists, remove it
            if (QRCodeTable[id]?.data?.schedule && takeAction) {
                del.schedule = true
            }
            break;
          case "after_expiry":
            if (!(typeof (data.after_expiry as any) == "string")) {
              return {
                valid: false,
                error: "INVALID_AFTER_EXPIRY",
                message: "after_expiry URL needs to be a string.",
              };
            }
              // If redirect_to is not specified in both QRCodeTable[id].data and update data, return an error
            if (!data?.redirect_to && !QRCodeTable[id].data.redirect_to) {
                return {
                    valid: false,
                    error: "INVALID_AFTER_EXPIRY",
                    message: "after_expiry requires redirect_to to be specified.",
                };
            }
            // If a schedule exists, remove it
            if (QRCodeTable[id]?.data?.schedule && takeAction) {
                del.schedule = true
            }
            break;
          case "schedule":
            if (!(typeof (data.schedule as any) == "object")) {
                return {
                  valid: false,
                  error: "INVALID_SCHEDULE",
                  message: "schedule needs to be an object.",
                };
            }

            if ((QRCodeTable[id]?.data?.after_expiry || QRCodeTable[id]?.data?.redirect_to) && takeAction) {
                del.redirect_to = true
                del.after_expiry = true
            }

            let invalid_parameters = Object.keys(data.schedule).filter((key) => !["monday","tuesday","wednesday","thursday","friday","saturday","sunday", "timezone"].includes(key))
            if (invalid_parameters.length != 0) {
                return {
                  valid: false,
                  error: "INVALID_SCHEDULE",
                  message: "Invalid schedule parameters: " + invalid_parameters.join(", "),
                };
            }
            //each parameter needs to be an object, and has to contain at least 2 keys in the HH:MM(:SS) format (keys result to objects), or 1 key called "ALL_DAY" (also an object)
            for (let day of Object.keys(data.schedule)) {
                if (day == "timezone") {
                    if (!moment.tz.zone(data.schedule.timezone)) {
                        return {
                          valid: false,
                          error: "INVALID_SCHEDULE",
                          message: "Invalid timezone: " + data.schedule.timezone,
                        };
                    }
                    continue;
                }
                if (!(typeof (data.schedule[day] as any) == "object")) {
                    return {
                      valid: false,
                      error: "INVALID_SCHEDULE",
                      message: "'schedule." + day + "' needs to be an object.",
                    };
                }
                if (Object.keys(data.schedule[day]).length == 0) {
                    return {
                      valid: false,
                      error: "INVALID_SCHEDULE",
                      message: "'schedule." + day + "' needs to contain one 'ALL_DAY' key, or at least 2 keys in the HH:MM(:SS) format, but not both.",
                    };
                }

                if (Object.keys(data.schedule[day]).length == 1 && !Object.keys(data.schedule[day]).includes("ALL_DAY")) {
                    return {
                      valid: false,
                      error: "INVALID_SCHEDULE",
                      message: "'schedule." + day + "' needs to contain one 'ALL_DAY' key, or at least 2 keys in the HH:MM(:SS) format, but not both.",
                    };
                }

                if (Object.keys(data.schedule[day]).length > 1 && Object.keys(data.schedule[day]).includes("ALL_DAY")) {
                    return {
                      valid: false,
                      error: "INVALID_SCHEDULE",
                      message: "'schedule." + day + "' needs to contain one 'ALL_DAY' key, or at least 2 keys in the HH:MM(:SS) format, but not both.",
                    };
                }

                if (Object.keys(data.schedule[day]).filter((key)=>/[0-9]{1,2}:[0-9]{1,2}(:[0-9]{1,2}|)/g.test(key)).length < 2 && !Object.keys(data.schedule[day]).includes("ALL_DAY")) {
                    return {
                      valid: false,
                      error: "INVALID_SCHEDULE",
                      message: "'schedule." + day + "' needs to contain one 'ALL_DAY' key, or at least 2 keys in the HH:MM(:SS) format, but not both.",
                    };
                } 

                for (let time of Object.keys(data.schedule[day])) {
                    if (!(typeof (data.schedule[day][time] as any) == "object")) {
                        return {
                            valid: false,
                            error: "INVALID_SCHEDULE",
                            message: "'schedule." + day + "." + time + "' needs to be an object.",
                        };
                    }
                    for (let key of Object.keys(data.schedule[day][time])) {
                        if (!["redirect_to","after_expiry"].includes(key)) {
                            return {
                                valid: false,
                                error: "INVALID_SCHEDULE",
                                message: "'schedule." + day + "." + time + "' can only contain 'redirect_to' and 'after_expiry'.",
                            };
                        }
                        if (!(typeof (data.schedule[day][time][key] as any) == "string")) {
                            return {
                              valid: false,
                              error: "INVALID_SCHEDULE",
                              message: "'schedule." + day + "." + time + "." + key + "' needs to be a string.",
                            };
                        }
                    }
                }
            }
            break;
          default:
            console.log(key);
            return {
              valid: false,
              error: "INVALID_DATA",
              message: "Invalid data.",
            };
        }
      }
        if (del.schedule) delete QRCodeTable[id].data.schedule
        if (del.redirect_to) delete QRCodeTable[id].data.redirect_to
        if (del.after_expiry) delete QRCodeTable[id].data.after_expiry
      return { valid: true };
    default:
      return { valid: false, error: "INVALID_TYPE", message: "Invalid type." };
  }
}
api.get("/qrcode/list", async (req, res) => {
  // Get all QR-codes that are linked to an identifier

  // Check if identifier is valid
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send({
      error: "NO_TOKEN",
      message: "No token provided.",
    });
  }

  let identifier = null
        // check if identifier is valid (it is already hashed)
    if (!(typeof (token as any) == "string")) {
        return res.status(400).send({
            error: "INVALID_TOKEN",
            message: "Token needs to be a string.",
        });
    }

    let tokenVerificationResult = await getUser(token)
    if (!tokenVerificationResult.isAuthenticated) {
        return res.status(400).send({
            error: "INVALID_TOKEN",
            message: "Invalid token.",
        });
    }
    identifier = tokenVerificationResult.user.id
  // get all QR-codes that are linked to the identifier
  const qrcodekeys = Object.keys(QRCodeTable).filter((key) => {
    return QRCodeTable[key].linked_to == identifier;
  });
  let qrCodes: Array<{}> = [];
  for (let qrcodekey of qrcodekeys) {
    let exportData = {}
if (req.query.export) {
  const exportType = (req?.query?.export as string)?.toLowerCase() ?? "svg,png"
  let exportTypes = exportType.split(",")
    if (exportTypes.filter(a=>!["svg","png"].includes(a)).length != 0) return res.status(400).send({error: "INVALID_EXPORT_TYPE", message: "Invalid export type."});
  for (let exportType of exportTypes) {
    switch (exportType) {
      case "svg":
        exportData["svg"] = await QRCodeGenerator.toString(
          serverURL + ":" + port  + "/qrcode/" + qrcodekey + "/handler",
          { type: "svg", errorCorrectionLevel: "H" }
        );
        break;
      case "png":
        exportData["png"] = await QRCodeGenerator.toDataURL(
          serverURL + ":" + port  + "/qrcode/" + qrcodekey + "/handler",
          { errorCorrectionLevel: "H", width: 400}
        );
        break;
      default:
        return res.status(400).send({
          error: "INVALID_EXPORT_TYPE",
          message: "Invalid export type: " + exportType,
        });
    }
  }
}
    qrCodes.push({
      id: qrcodekey,
      ...QRCodeTable[qrcodekey],
      ...exportData,
    });
  }
  return res.status(200).send(qrCodes);
});
api.post("/qrcode/:id/scan", async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).send({
        error: "NO_ID",
        message: "No ID provided.",
      });
    }
    if (!(typeof (id as any) == "string")) {
      return res.status(400).send({
        error: "INVALID_ID",
        message: "ID needs to be a string.",
      });
    }
    if (!Object.keys(QRCodeTable).includes(id)) {
      return res.status(400).send({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      });
    }
    if (QRCodeTable[id].expires && QRCodeTable[id].expires < new Date()) {
        return res.status(400).send({
            error: "EXPIRED",
            message: "QR-code has expired.",
          });
    }
    if (!QRCodeTable[id].settings.getScanData) {
        return res.status(400).send({
            error: "SCAN_DATA_NOT_ENABLED",
            message: "Scan data is not enabled for this QR-code.",
          });
    }
    if (QRCodeTable[id].settings.requirements.location && !req?.body?.location) {
        return res.status(400).send({
            error: "NO_LOCATION",
            message: "Location is required for this QR-code.",
          });
    }
    if (QRCodeTable[id].settings.requirements.location && (!req?.body?.location?.latitude || !req?.body?.location?.longitude || !req?.body?.location?.accuracy)) {
        return res.status(400).send({
            error: "NO_LOCATION",
            message: "Location is required for this QR-code.",
          });
    }
    if ((typeof req?.body?.location?.latitude != "number" || typeof req?.body?.location?.longitude != "number" || typeof req?.body?.location?.accuracy != "number")) {
        if (QRCodeTable[id].settings?.requirements?.location) {
            return res.status(400).send({
                error: "INVALID_LOCATION",
                message: "Invalid location data.",
            });
        } else {
            req.body.location = null
        }
    }


    const scanData: {
        fingerprint?: string;
        "user-agent"?: string;
        timestamp?: Date;
        ip?: string;
        location?: {
            latitude: number;
            longitude: number;
            accuracy: number;
        }
    } = {}

    if (QRCodeTable[id].settings.scanData.fingerprint) scanData["fingerprint"] = req.body.fingerprint
    if (QRCodeTable[id].settings.scanData["user-agent"]) scanData["user-agent"] = req.headers["user-agent"]
    if (QRCodeTable[id].settings.scanData.timestamp) scanData["timestamp"] = new Date()
    if (QRCodeTable[id].settings.scanData.ip) scanData["ip"] = req.body.ip ?? req.ip
    if (QRCodeTable[id].settings.scanData.location) scanData["location"] = req.body.location


    QRCodeTable[id].scanCount++;
    QRCodeTable[id].scanData.push(scanData)
    saveQR(id, QRCodeTable[id], true)
    console.log("[QRCode] ScanData for QR-code " + id + " was submitted.");
    return res.status(204).send({});
})
api.post("/qrcode", async (req, res) => {
  // Get user-specified ID, or generate one
  let { id, update_key } = {
    ...{
      id: crypto.randomUUID(),
      update_key: await randomString(32),
    },
    ...(req.body as Partial<{ id: string; update_key: string }>),
  };
  const { type, data, expires, name, description, settings } = req.body;
  const token = req.headers.authorization;

  // Check if type is valid
  if (!type) {
    return res.status(400).send({
      error: "NO_TYPE",
      message: "No type provided.",
    });
  }
  if (!(typeof (type as any) == "string")) {
    return res.status(400).send({
      error: "INVALID_TYPE",
      message: "Type needs to be a string.",
    });
  }
  if (!supportedTypes.includes(type)) {
    return res.status(400).send({
      error: "UNSUPPORTED_TYPE",
      message:
        "Type not supported. Supported types: " + supportedTypes.join(", "),
    });
  }
  if (name) {
    if (!(typeof (name as any) == "string")) {
      return res.status(400).send({
        error: "INVALID_NAME",
        message: "Name needs to be a string.",
      });
    }
    // no longer than 50
    if (name.length > 50) {
      return res.status(400).send({
        error: "INVALID_NAME",
        message: "Name needs to be less than 50 characters.",
      });
    }
  }
    if (description) {
        if (!(typeof (description as any) == "string")) {
        return res.status(400).send({
            error: "INVALID_DESCRIPTION",
            message: "Description needs to be a string.",
        });
        }
        // no longer than 200
        if (description.length > 200) {
        return res.status(400).send({
            error: "INVALID_DESCRIPTION",
            message: "Description needs to be less than 200 characters.",
        });
        }
    }

  // Check if data is valid
  if (!data) {
    return res.status(400).send({
      error: "NO_DATA",
      message: "No data provided.",
    });
  }
  const dataValidity = await checkDataValidity(type, data, id);
  if (!dataValidity.valid) {
    return res.status(400).send({
      error: dataValidity.error,
      message: dataValidity.message,
    });
  }

  if (data.redirect_to) {
    data.redirect_to = data.redirect_to.trim();
  }

  // Check if ID is valid
  if (!(typeof (id as any) == "string")) {
    return res.status(400).send({
      error: "INVALID_ID",
      message: "ID needs to be a string.",
    });
  }

  // Check if update key is valid
  if (!(typeof (update_key as any) == "string")) {
    return res.status(400).send({
      error: "INVALID_UPDATE_KEY",
      message: "update_key needs to be a string.",
    });
  }
  let identifier = undefined
  if (token) {
    // check if identifier is valid (it is already hashed)
    if (!(typeof (token as any) == "string")) {
      return res.status(400).send({
        error: "INVALID_TOKEN",
        message: "Token needs to be a string.",
        });
    }
    let tokenVerificationResult = await getUser(token)
    if (!tokenVerificationResult.isAuthenticated) {
        return res.status(400).send({
            error: "INVALID_TOKEN",
            message: "Invalid token.",
        });
    }

    identifier = tokenVerificationResult.user.id
  }
  if (expires) {
    // needs to be a date or null
    if (
      ((new Date(expires) as any) == "Invalid Date" ||
        !(typeof (expires as any) == "string")) &&
      expires != null
    ) {
      return res.status(400).send({
        error: "INVALID_EXPIRES",
        message: "expires needs to be a date or null.",
      });
    }
  }

  if (settings) {
    // has to be an object
    if (!(typeof (settings as any) == "object")) {
      return res.status(400).send({
        error: "INVALID_SETTINGS",
        message: "settings needs to be an object.",
      });
    }
  }

  if (!/^[a-zA-Z0-9_.-]*$/.test(id)) return res.status(400).send({error: "INVALID_ID", message: "'id' can only contain alphanumeric characters, underscores and dashes and periods."});

  // Check if ID is already in use, as well as if it's user-specified, if both are true, return an error, otherwise, if it's only in use, generate a new ID until it is not in use
  while (QRCodeTable[id]) {
    if (req.body.id) {
      return res.status(400).send({
        error: "ID_IN_USE",
        message: "ID already in use.",
      });
    }
    id = crypto.randomUUID();
  }

  QRCodeTable[id] = {
    type,
    data,
    update_key,
    created: new Date(),
    updated: new Date(),
    name: name ? name : null,
    description: description ? description : null,
    linked_to: identifier ? identifier : null,
    expires: expires ? new Date(expires) : null,
    scanCount: 0,
    scanData: [],
    settings: {
        getScanData: settings?.getScanData ?? true,
        scanData: {
            fingerprint: settings?.scanData?.fingerprint ?? false,
            "user-agent": settings?.scanData?.["user-agent"] ?? false,
            timestamp: settings?.scanData?.timestamp ?? true,
            ip: settings?.scanData?.ip ?? false,
            location: settings?.scanData?.location ?? false,
        },
        requirements: {
            location: settings?.requirements?.location ?? false, //! Warning, this currently does not work on iOS, as it does not like to share location data with http:// websites, will be fixed when we move to https://
        }
    }
  };
  saveQR(id, QRCodeTable[id])

  const qrcode = await QRCodeGenerator.toString(
    serverURL + ":" + port  + "/qrcode/" + id + "/handler",
    { type: "svg", errorCorrectionLevel: "H" }
  );

  return res.status(201).send({
    id,
    update_key,
    type,
    data,
    svg: (qrcode as string).trim(),
  });
});

api.get("/qrcode/:id", async (req, res) => {
  const { id } = req.params;
  const {export:fileExport} = req.query
  /*
    ?export=pdf
  */
  const token = req.headers.authorization;
  if (!id) {
    return res.status(400).send({
      error: "NO_ID",
      message: "No ID provided.",
    });
  }
  if (!(typeof (id as any) == "string")) {
    return res.status(400).send({
      error: "INVALID_ID",
      message: "ID needs to be a string.",
    });
  }
  if (!Object.keys(QRCodeTable).includes(id)) {
    return res.status(400).send({
      error: "INVALID_ID",
      message: "Invalid ID provided.",
    });
  }
    // TODO: Make it so that we don't have to generate the QRCode twice
    let identifier = null
    if (token) {
        // check if identifier is valid (it is already hashed)
      if (!(typeof (token as any) == "string")) {
          return res.status(400).send({
              error: "INVALID_TOKEN",
              message: "Token needs to be a string.",
          });
      }
    
      let tokenVerificationResult = await getUser(token)
      if (!tokenVerificationResult.isAuthenticated) {
          return res.status(400).send({
              error: "INVALID_TOKEN",
              message: "Invalid token.",
          });
      }
      identifier = tokenVerificationResult.user.id
    }
    let qrcodeCopy = JSON.parse(JSON.stringify(QRCodeTable[id]));
    if (!identifier || identifier != qrcodeCopy.linked_to) {
        delete qrcodeCopy.update_key;
        delete qrcodeCopy.linked_to;
        delete qrcodeCopy.scanData;
        delete qrcodeCopy.scanCount;
        delete qrcodeCopy.settings;
        delete qrcodeCopy.expires;
        delete qrcodeCopy.data;
        delete qrcodeCopy.type;
        delete qrcodeCopy.name;
        delete qrcodeCopy.description;
    }
  let exportData = {}
  if (fileExport) {
    const exportType = (fileExport as string)?.toLowerCase() ?? "svg,png,pdf"
    let exportTypes = exportType.split(",")
    if (exportTypes.filter(a=>!["svg","png","pdf"].includes(a)).length != 0) return res.status(400).send({error: "INVALID_EXPORT_TYPE", message: "Invalid export type."});
    for (let exportType of exportTypes) {
      switch (exportType) {
        case "svg":
          exportData["svg"] = await QRCodeGenerator.toString(
            serverURL + ":" + port  + "/qrcode/" + id + "/handler",
            { type: "svg", errorCorrectionLevel: "H" }
          );
          break;
        case "png":
          exportData["png"] = await QRCodeGenerator.toDataURL(
            serverURL + ":" + port  + "/qrcode/" + id + "/handler",
            { errorCorrectionLevel: "H", width: 400}
          );
          break;
        case "pdf":
            if (!identifier || identifier != qrcodeCopy.linked_to) {
                return res.status(401).send({
                    error: "UNAUTHORIZED",
                    message: "You are not authorized to export this QR-code as a PDF. If you are the owner of this QR-code, please provide your token in the 'Authorization' header.",
                  });
            }
            exportData["pdf"] = await QRCode2PDF(qrcodeCopy, id)
            break;
        default:
          return res.status(400).send({
            error: "INVALID_EXPORT_TYPE",
            message: "Invalid export type: " + exportType,
          });
      }
    }
  }

    return res.status(200).send({
        id, 
      ...qrcodeCopy,
      ...exportData
    });
});
api.get("/srvinfo", async (req, res) => {
    console.log("[API] Server info requested.")
    return res.status(200).send({
        serverURL: serverURL + ":" + port,
        version: "1.0.0"
    });
})
api.patch("/qrcode/:id", async (req, res) => {
  let { update_key, update } = req.body;
  let { id } = req.params;
  if (!id) {
    return res.status(400).send({
      error: "NO_ID",
      message: "No ID provided.",
    });
  }
  if (!(typeof (id as any) == "string")) {
    return res.status(400).send({
      error: "INVALID_ID",
      message: "ID needs to be a string.",
    });
  }
  if (!Object.keys(QRCodeTable).includes(id)) {
    return res.status(400).send({
      error: "INVALID_ID",
      message: "Invalid ID provided.",
    });
  }
  if (!update_key) {
    return res.status(400).send({
      error: "NO_UPDATE_KEY",
      message: "No update_key provided.",
    });
  }
  if (!(typeof (update_key as any) == "string")) {
    return res.status(400).send({
      error: "INVALID_UPDATE_KEY",
      message: "update_key needs to be a string.",
    });
  }

  if (QRCodeTable[id].update_key != update_key) {
    return res.status(401).send({
      error: "INVALID_UPDATE_KEY",
      message: "Invalid update_key provided.",
    });
  }

  if (!update) {
    return res.status(400).send({
      error: "NO_UPDATE",
      message: "No update provided.",
    });
  }

  // update needs to be an object
  if (!(typeof (update as any) == "object")) {
    return res.status(400).send({
      error: "INVALID_UPDATE",
      message: "update needs to be an object.",
    });
  }
  let wasAnytingUpdated = false;
  const supportedUpdateKeys = [
    "type",
    "data",
    "update_key",
    "linked_to",
    "expires",
    "id",
    "description",
    "name",
    "settings"
  ]
  if (Object.keys(update).filter((key) => !supportedUpdateKeys.includes(key)).length != 0) {
    return res.status(400).send({
      error: "INVALID_ARGUMENTS",
      message: "Invalid arguments provided: " + Object.keys(update).filter((key) => !supportedUpdateKeys.includes(key)).join(", "),
    });
  }
  for (let key of Object.keys(update)) {
    switch (key) {
      case "type":
        if (QRCodeTable[id].type == update.type) break;

        //! Needs to be supported
        /* prettier-ignore */
        if (!supportedTypes.includes(update.type)) return res.status(400).send({error: "UNSUPPORTED_TYPE", message: "Type not supported. Supported types: " + supportedTypes.join(", ")});
        //! Needs to contain a valid data object
        if (!update.data) return res.status(400).send({ error: "NO_DATA", message: "No data provided." });
        if (!(typeof (update.data as any) == "object")) return res.status(400).send({error: "INVALID_DATA", message: "'update.data' needs to be an object.",});
        const dataValidity = await checkDataValidity(update.type, update.data, id, true);
        //! Return error if data is invalid for specified type
        if (!dataValidity.valid) return res.status(400).send({ error: dataValidity.error, message: dataValidity.message });

        if (update.data.redirect_to) {
            update.data.redirect_to = update.data.redirect_to.trim();
        }

        QRCodeTable[id].type = update.type;
        QRCodeTable[id].data = {...QRCodeTable[id].data,...update.data};
        wasAnytingUpdated = true;
        break;
      case "data":
        if (Object.keys(update).includes("type")) break; //! handled by 'case "type"'
        if (JSON.stringify(QRCodeTable[id].data) == JSON.stringify({...QRCodeTable[id].data,...update.data})) break; //! no need to update if data is the same

        //! Needs to be an object
        if (!(typeof (update.data as any) == "object")) return res.status(400).send({error: "INVALID_DATA", message: "'update.data' needs to be an object.",});
        //! Needs to be valid for specified type
        const dataValidity2 = await checkDataValidity(QRCodeTable[id].type, update.data, id, true);
        if (!dataValidity2.valid) return res.status(400).send({error: dataValidity2.error, message: dataValidity2.message });

        if (update.data.redirect_to) {
            update.data.redirect_to = update.data.redirect_to.trim();
        }

        QRCodeTable[id].data = {...QRCodeTable[id].data,...update.data};
        wasAnytingUpdated = true;
        break;
      case "update_key":
        if (QRCodeTable[id].update_key == update.update_key) break; //! no need to update if update_key is the same

        //! Needs to be a string
        if (!(typeof (update.update_key as any) == "string")) return res.status(400).send({error: "INVALID_UPDATE_KEY", message: "'update.update_key' needs to be a string."});

        QRCodeTable[id].update_key = update.update_key;
        wasAnytingUpdated = true;
        break;
      case "linked_to":
          
          //! Needs to be a string
          if (!(typeof (update.linked_to as any) == "string")) return res.status(400).send({error: "INVALID_LINKED_TO", message: "'update.linked_to' needs to be a string."});
          
          let token = update.linked_to
          let tokenVerificationResult = await getUser(token)
          if (!tokenVerificationResult.isAuthenticated) {
              return res.status(400).send({
                  error: "INVALID_LINKED_TO",
                  message: "Invalid token.",
                });
            }
        if (QRCodeTable[id].linked_to == tokenVerificationResult.user.id) break; //! no need to update if linked_to is the same
        QRCodeTable[id].linked_to = tokenVerificationResult.user.id;

        wasAnytingUpdated = true;
        break;
      case "expires":
        if (QRCodeTable[id].expires == update.expires) break; //! no need to update if expires is the same

        //! Needs to be a date or null
        if (((new Date(update.expires) as any) == "Invalid Date" || !(typeof (update.expires as any) == "string")) && update.expires != null) return res.status(400).send({error: "INVALID_EXPIRES", message: "'update.expires' needs to be a date or null."});

        QRCodeTable[id].expires = update.expires;
        wasAnytingUpdated = true;
        break;
      case "id":
        if (id == update.id) break; //! no need to update if id is the same

        //! Needs to be a string
        if (!(typeof (update.id as any) == "string")) return res.status(400).send({error: "INVALID_ID", message: "'update.id' needs to be a string."});

        if (!/^[a-zA-Z0-9_.-]*$/.test(update.id)) return res.status(400).send({error: "INVALID_ID", message: "'update.id' can only contain alphanumeric characters, underscores and dashes and periods."});


        //! Needs to be a valid ID
        if (QRCodeTable[update.id]) return res.status(400).send({error: "ID_IN_USE", message: "ID already in use."});

        QRCodeTable[update.id] = QRCodeTable[id];
        delete QRCodeTable[id];
        id = update.id;
        wasAnytingUpdated = true;
        break;
      case "description":
        if (QRCodeTable[id].description == update.description) break; //! no need to update if description is the same

        //! Needs to be a string
        if (!(typeof (update.description as any) == "string")) return res.status(400).send({error: "INVALID_DESCRIPTION", message: "'update.description' needs to be a string."});

        //! no longer than 200
        if (update.description.length > 200) return res.status(400).send({error: "INVALID_DESCRIPTION", message: "Description needs to be less than 200 characters."});

        QRCodeTable[id].description = update.description;
        wasAnytingUpdated = true;
        break;
      case "name":
        if (QRCodeTable[id].name == update.name) break; //! no need to update if name is the same

        //! Needs to be a string
        if (!(typeof (update.name as any) == "string")) return res.status(400).send({error: "INVALID_NAME", message: "'update.name' needs to be a string."});

        //! no longer than 50
        if (update.name.length > 50) return res.status(400).send({error: "INVALID_NAME", message: "Name needs to be less than 50 characters."});

        QRCodeTable[id].name = update.name;
        wasAnytingUpdated = true;
        break;
      case "settings":
        //! Needs to be an object
        if (!(typeof (update.settings as any) == "object")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings' needs to be an object."});

        if (JSON.stringify(QRCodeTable[id].settings) == JSON.stringify(update.settings)) break; //! no need to update if settings are the same

        //settings cannot be empty
        if (Object.keys(update.settings).length == 0) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings' cannot be empty."});

        //! Needs to be a valid settings object
        if (update.settings.getScanData) {
            //! Needs to be a boolean
            if (!(typeof (update.settings.getScanData as any) == "boolean")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.getScanData' needs to be a boolean."});
        }
        if (update.settings.scanData) {
            //! Needs to be an object
            if (!(typeof (update.settings.scanData as any) == "object")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.scanData' needs to be an object."});
            //! Needs to be a valid scanData object
            if (update.settings.scanData.fingerprint) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData.fingerprint as any) == "boolean")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.scanData.fingerprint' needs to be a boolean."});
            }
            if (update.settings.scanData["user-agent"]) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData["user-agent"] as any) == "boolean")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.scanData.user-agent' needs to be a boolean."});
            }
            if (update.settings.scanData.timestamp) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData.timestamp as any) == "boolean")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.scanData.timestamp' needs to be a boolean."});
            }
            if (update.settings.scanData.ip) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData.ip as any) == "boolean")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.scanData.ip' needs to be a boolean."});
            }
            if (update.settings.scanData.location) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData.location as any) == "boolean")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.scanData.location' needs to be a boolean."});
            }
        }
        if (update.settings.requirements) {
            //! Needs to be an object
            if (!(typeof (update.settings.requirements as any) == "object")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.requirements' needs to be an object."});
            //! Needs to be a valid requirements object
            if (update.settings.requirements.location) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.requirements.location as any) == "boolean")) return res.status(400).send({error: "INVALID_SETTINGS", message: "'update.settings.requirements.location' needs to be a boolean."});
            }
        }
        QRCodeTable[id].settings = {
            getScanData: update.settings.getScanData ?? QRCodeTable[id].settings.getScanData,
            scanData: {
                fingerprint: update.settings.scanData?.fingerprint ?? QRCodeTable[id].settings.scanData.fingerprint,
                "user-agent": update.settings.scanData?.["user-agent"] ?? QRCodeTable[id].settings.scanData["user-agent"],
                timestamp: update.settings.scanData?.timestamp ?? QRCodeTable[id].settings.scanData.timestamp,
                ip: update.settings.scanData?.ip ?? QRCodeTable[id].settings.scanData.ip,
                location: update.settings.scanData?.location ?? QRCodeTable[id].settings.scanData.location,
            },
            requirements: {
                location: update.settings.requirements?.location ?? QRCodeTable[id].settings.requirements.location, //! Warning, this currently does not work on iOS, as it does not like to share location data with http:// websites, will be fixed when we move to https://
            }
        }
        wasAnytingUpdated = true;
        break;
      default:
        return res.status(400).send({
          error: "INVALID_UPDATE",
          message: "Invalid update.",
        });

    }
}
  const qrcode = await QRCodeGenerator.toString(
    serverURL + ":" + port  + "/qrcode/" + id + "/handler",
    { type: "svg", errorCorrectionLevel: "H" }
  );
  if (!wasAnytingUpdated) {
    return res.status(200).send({
        id,
        type: QRCodeTable[id].type,
        data: QRCodeTable[id].data,
        linked_to: QRCodeTable[id].linked_to,
        expires: QRCodeTable[id].expires,
        svg: (qrcode as string).trim(),  
    });
  }
  QRCodeTable[id].updated = new Date();
  saveQR(id, QRCodeTable[id], true)

  let additionalInformation = {};
  if (update.id) {
    additionalInformation = {
        ...additionalInformation,
        message: "You have changed the ID of this QR-code. Keep in mind that this means that the old ID will no longer work, and that you will have to update the QR-code everywhere you have used it.",
        msg_short: "ID_CHANGE_WARNING"
    }
  }
  return res.status(200).send({
    ...{
      id,
      type: QRCodeTable[id].type,
      data: QRCodeTable[id].data,
      linked_to: QRCodeTable[id].linked_to,
      expires: QRCodeTable[id].expires,
      svg: (qrcode as string).trim(),
    },
    ...additionalInformation,
  });
});

api.get("/qrcode/:id/handler", (req, res) => {
  const { id } = req.params
  // Make sure request is fresh
  if (!req.query._) {
    let nowFlipped = new Date().getTime().toString().split("").reverse().join("") // This is to confuse potential attackers that might try to add fake scans
    return res.redirect("/qrcode/" + id + "/handler?_=" + Buffer.from(nowFlipped).toString("base64")) // By doing this, /qrcode/:id/handler will not show up in the user's history, preventing them from going back to the QR-code after it has been scanned which also prevents a fake scan count
  } else {
    const then = new Date(parseInt(Buffer.from(req.query._ as string, "base64").toString("utf-8").split("").reverse().join("")))
    const now = new Date().getTime()
    if (now - then.getTime() > 2000 || then.getTime() - now > 0) { 
      return res.status(400).send({
        error: "INVALID",
        message: "This request is invalid."
      })
    }
  }
  if (!Object.keys(QRCodeTable).includes(id)) {
    return res.status(400).send({
      error: "INVALID_ID",
      message: "Invalid ID provided.",
    });
  }
  console.log("[QRCode] QR-code was scanned: " + id);
  const { type, data } = QRCodeTable[id];
  let currentAction: Partial<QRCodeData> = {}
  if (data.schedule) {
    let day = moment().tz(data.schedule.timezone ?? moment.tz.guess()).format("dddd").toLowerCase()
    let time = getPassedTime(Object.keys(data.schedule[day]), data.schedule.timezone ?? moment.tz.guess())
    if (!time) {
        let currentDay = moment().tz(data.schedule.timezone ?? moment.tz.guess())
        // go back a day and try again
        let maxiumumDaysToGoBack = 7
        while (!time) {
            currentDay.subtract(1, "days")
            day = currentDay.format("dddd").toLowerCase()
            time = getPassedTime(Object.keys(data.schedule[day]), data.schedule.timezone ?? moment.tz.guess())

            maxiumumDaysToGoBack--
            if (maxiumumDaysToGoBack == 0) {
                console.log("[QRCode] No valid schedule found for QR-code " + id + "!!")
                if (req.accepts("text/html")) {
                    return res.status(500).send(`
                    <html>
                        <head>
                            <title>DynamicQR</title>
                        </head>
                        <body>
                            <p>This QR-code has an invalid schedule, please check back later.</p>
                        </body>
                    </html>
                    `);
                }
                res.status(500).send({error: "NO_VALID_SCHEDULE", message: "No valid schedule found for this QR-code."})
                return
            }
        }
    } 
    currentAction = data.schedule[day][time]
  } else {
    currentAction = data;
  }
  if (!QRCodeTable[id].settings.getScanData) {
      QRCodeTable[id].scanCount++; //! Only add to scanCount if we are not getting scan data
      saveQR(id, QRCodeTable[id], true)
  }
  if (QRCodeTable[id].expires) {
    if (new Date() > new Date(QRCodeTable[id].expires as Date)) {
      if (currentAction.after_expiry) {
        console.log("[QRCode] QR-code has expired, redirecting to: " + currentAction.after_expiry);
        res.redirect(currentAction.after_expiry);
        return;
      }
      if (req.accepts("text/html")) {
        return res.status(400).send(`
        <html>
            <head>
                <title>DynamicQR</title>
            </head>
            <body>
                <p>This QR-code has expired.</p>
            </body>
        </html>
        `);
      } else {
        return res.status(400).send({
          error: "EXPIRED",
          message: "This QR-code has expired.",
        });
      }
    }
  }

  switch (type) {
    case "redirect":
      if (!currentAction.redirect_to) {
        return res.status(500).send({
          error: "NO_REDIRECT",
          message: "No redirect URL provided.",
        });
      }
      if (QRCodeTable[id].settings.getScanData) {
        // if only timestamp or user-agent is requested, we can get it using express and redirect them normally
        if (Object.keys(QRCodeTable[id].settings.scanData).filter((key) => !["timestamp", "user-agent"].includes(key) && QRCodeTable[id].settings.scanData[key]).length == 0) {

          let finalScanData: Partial<{
              fingerprint: string,
              "user-agent": string,
              timestamp: Date,
              ip: string,
              location: {
                  latitude: number,
                  longitude: number,
                  accuracy: number
              }
          }> = {}
          if (QRCodeTable[id].settings.scanData.timestamp) {
              finalScanData.timestamp = new Date()
          }
          if (QRCodeTable[id].settings.scanData["user-agent"]) {
              finalScanData["user-agent"] = req.headers["user-agent"]
          }

          QRCodeTable[id].scanData.push(finalScanData)
          QRCodeTable[id].scanCount++
          saveQR(id, QRCodeTable[id], true)
          if (!(currentAction.redirect_to.toLowerCase().startsWith("begin:vcard") && currentAction.redirect_to.toLowerCase().endsWith("end:vcard"))){
            console.log("[QRCode] Redirecting to: " + currentAction.redirect_to);
            return res.redirect(currentAction.redirect_to);
          } 
        }
      if (currentAction.redirect_to.toLowerCase().startsWith("begin:vcard") && currentAction.redirect_to.toLowerCase().endsWith("end:vcard")){
        console.log("[QRCode] Redirecting to vCard: " + currentAction.redirect_to.replace(/\n/g,"%0A"));
        return res.status(200).send(
            `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="refresh" content="0;url=data:text/vcard;charset=utf-8,${currentAction.redirect_to.replace(/\n/g,"%0A")}">
                <title>Redirecting...</title>
            </head>
            <body>
                <p>If you are not redirected, <a download="vcard_${new Date().getTime()}.vcf" href="data:text/vcard;charset=utf-8,${currentAction.redirect_to.replace(/\n/g,"%0A")}">click here</a>.</p>
            </body>
            </html>
            `
        )
      }
          let body = '<script src="https://cdnjs.cloudflare.com/ajax/libs/ClientJS/0.2.1/client.min.js" integrity="sha512-2WLGNBqBSz+HMXWugyIdkJNr6fPanvXsjj5ivuMzmztNgKVaJHJIcn6tkqmVoV4EKJYdzlLfNi0O1K3e1EtWAQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n'
            let javascriptCode = `(async()=>{let client = new ClientJS();\nconst finalData = {};\nasync function getPos(){return new Promise((resolve,reject)=>{navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy: true})})};\n`

            if (QRCodeTable[id].settings.scanData.fingerprint) {
                javascriptCode += `finalData.fingerprint = client.getCustomFingerprint(client.getBrowserData().ua,client.getCanvasPrint())\n`
            }
            if (QRCodeTable[id].settings.scanData["user-agent"]) {
                javascriptCode += `finalData["user-agent"] = client.getBrowserData().ua ?? "${req.headers["user-agent"]}"\n`
            }
            if (QRCodeTable[id].settings.scanData.timestamp) {
                javascriptCode += `finalData.timestamp = ${new Date().getTime()}\n`
            }
            if (QRCodeTable[id].settings.scanData.ip) {
                javascriptCode += `finalData.ip = (await (await fetch("https://api.ipify.org/?format=json")).json()).ip\n`
            }
            if (QRCodeTable[id].settings.scanData.location) {
                javascriptCode += `
                if (navigator.geolocation) {
                    getPos().then((pos)=>{
                    finalData.location = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    }
                    send_and_redirect()
                }).catch((err)=>{
                    if (${QRCodeTable[id].settings.requirements.location}) {
                        alert("This QR-code requires location to be sent to the server, but you have denied access to your location. Please allow access to your location and rescan the QR-code.")
                        return
                    } else {
                        finalData.location = null
                        send_and_redirect()
                    }
                })} else {
                    if (${QRCodeTable[id].settings.requirements.location}) {
                        alert("This QR-code requires location to be sent to the server, but your browser does not support it. Please use a different browser.")
                        return
                    }
                    finalData.location = null
                    send_and_redirect()
                };\n`
            } else {
                javascriptCode += `\nsend_and_redirect();\n`
            }

            javascriptCode += `function send_and_redirect(){
                console.log("[QRCode] Sending data to server...")
                fetch("${serverURL + ":" + port}/qrcode/${id}/scan", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(finalData)
                }).then(()=>{
                    console.log("[QRCode] Redirecting to: " + "${currentAction.redirect_to}");
                    window.location.href = "${currentAction.redirect_to}"
                }).catch((err)=>{
                    alert("An error occured while sending your data to the server. Please try again later.")
                })
            }\n})()`

            return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>DynamicQR</title>
            </head>
            <body>
                <p>Redirecting...</p>
                ${body}
                <script>${javascriptCode}</script>
            </body>
            </body>
            </html>
            `);
    } else {
      console.log("[QRCode] Redirecting to: " + currentAction.redirect_to);
      return res.redirect(currentAction.redirect_to);
    }
    default:
      return res.status(500).send({
        error: "INVALID_TYPE",
        message: "Invalid type.",
      });
  }
});

async function QRCode2PDF(qrcode, id) {

    function settings2HTML(settings) {
        let rtrn = []
        let template = `<span>[TXT]</span>`

        rtrn.push(template.replace("[TXT]", "Get scan data -> " + (settings.getScanData ? "YES" : "NO")))
        if (settings.getScanData) {
            rtrn.push(template.replace("[TXT]", "Get Device Fingerprint -> " + (settings.scanData.fingerprint ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get User-Agent -> " + (settings.scanData["user-agent"] ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get Timestamp -> " + (settings.scanData.timestamp ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get IP -> " + (settings.scanData.ip ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get Location -> " + (settings.scanData.location ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Require Location -> " + (settings.requirements.location ? "YES" : "NO")))
        }
        return rtrn.join("<br>")
    }

    let owner: {
        object:string,
        id:string,
        email: string,
        emailVerified: boolean,
        firstName: string | null,
        lastName: string | null,
        createdAt: Date | string,
        updatedAt: Date|string
    } | null = null
    if (qrcode.linked_to) {
        owner = await resolveID(qrcode.linked_to)
    }
    const html = `
<!doctype html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>   
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    </head>
    <body>
        <div style="font-family: 'Inter', sans-serif;min-height:100%;position:absolute;min-width: 100%;top: 0;left: 0;">
            <img alt="QR Code" loading="eager" width="250" height="250" decoding="async" data-nimg="1" style="color:transparent;position:relative;left:50%;top:50px;transform:translateX(-50%)" src="${await QRCodeGenerator.toDataURL(serverURL + ":" + port  + "/qrcode/" + id + "/handler",{ errorCorrectionLevel: "H" })}"/>
            <hr style="position:relative;left:50%;transform:translateX(-50%);top:70px;width:80%;height:4px;background:#000000;border-radius:8px;"/>
            <div id="title" style="position: relative;left:50%;top: 80px;transform:translateX(-50%);width:60%;height:auto;text-align:center">
                <h1 id="name" style="font-size:30px;font-weight:900">DynamicQR</h1>
                <p id="id" style="font-size:16px;font-weight:500;color:#929292;bottom: 5px;position:relative">[${id}]</p>
            </div>
            <hr style="position: relative;left:50%;transform:translateX(-50%);top: 85px;width:50%;height:3px;background:#c1c1c1;border-radius:8px;">
            <div id="information" style="position: relative;left:50%;top: 100px;transform:translateX(-50%);width:60%;height:auto;text-align:center; font-weight:400;">
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-id-cntr">ID:<br><b>
                    <span id="qr-id">${id}</span>
                </b></p>
                ${qrcode.update_key ? `
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-id-cntr">Update Key:<br><b>
                    <span id="qr-updatekey">${qrcode.update_key}</span>
                </b></p>` : ""}
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-name-cntr">Name:<br><b>
                    <span id="qr-name">${qrcode.name ? qrcode.name : "---"}</span>
                </b></p>
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-description-cntr">Description<br><b>
                    <span id="qr-description">${qrcode.description ? qrcode.description : "---"}</span>
                </b></p>
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-createdat-cntr">Created At:<br><b>
                    <span id="qr-createdat">${new Date(qrcode.created).toUTCString()}</span>
                </b></p>
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-expires-cntr">Expires:<br><b>
                    <span id="qr-expires">${qrcode.expires ? new Date(qrcode.expires).toUTCString() : "Never"}</span>
                </b></p>
                ${qrcode.linked_to ? `
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-linkedto-cntr">Linked To:<br><b>
                    <span id="qr-linkedto">${owner.email}</span>
                </b></p>` : ""}
                ${qrcode.scanCount || qrcode.scanCount == 0  ? `
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-scan-cntr">Scan Count:<br><b>
                    <span id="qr-scan">${qrcode.scanCount}</span>
                </b></p>` : ""}
                ${qrcode.settings ? `
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-settings-cntr">Settings:<br><b>
                    ${settings2HTML(qrcode.settings)}
                </b></p>` : ""}
            </div>
        </div>
    </body>
</html>

`;

console.log(html)

//TODO: use puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      defaultViewport: null,
    //   ignoreDefaultArgs: true,
      args: [
        "--mute-audio",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html,{
        waitUntil: "networkidle0"
    });
    // wait for the page to fully load
    await page.waitForSelector("body > div > img");
    // await page.waitForSelector("body > div > hr");
    await page.addStyleTag({ content: '@page { size: A4; line-height: inherit; }' });
    await page.pdf({ path: path.join(__dirname, "..","qrcode_"+id+".pdf"), format: "A4", printBackground: true, scale: 0.87, pageRanges: "1"});
    await browser.close();
    console.log("[QRCode] Generated PDF for QR-code " + id);
    let contents = fs.readFileSync(path.join(__dirname, "..","qrcode_"+id+".pdf"), 'base64');
    fs.unlinkSync(path.join(__dirname, "..","qrcode_"+id+".pdf"));
    return "data:application/pdf;base64," + contents;
}

api.use(function (_req, res) {
  res.status(404).send({ error: "NOT_FOUND", message: "The requested resource could not be found on the server." });
});
process.on("beforeExit", async () => {
    if (mongoClient) {
        console.log("[API] Closing MongoDB connection...")
        await mongoClient.close().catch(()=>{})
    } else if (storageMethod == "file") {
        console.log("[API] Saving QRCodeTable to file...")
        await saveQR()
    }

})
api.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
})()