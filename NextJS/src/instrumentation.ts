export const runtime = "nodejs"

import { QRLinkGlobal } from "@/types/api/v1/global"
import { QRCodeTable } from "@/types/api/v1/QRCode"

declare const global: QRLinkGlobal

export async function register(){
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { bareBonesConnection, convertFile2MongoDB, ensureDBSetup, readQRCodeTable } = await import("./utilities/api/v1/database");
        const { saveQR } = await import("./utilities/api/v1/database");
        const { doesUserExist, fetchUsersCache } = await import("./utilities/api/v1/authentication");

        const { MongoClient, MongoError } = await import("mongodb");
        const fs = await import("fs");
        console.log("[BE] Setting up backend...")
        global.supportedUpdateKeys = [
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
        global.supportedTypes = ["redirect", "schedule", "location", "user-agent"]
        global.storageMethod = "file";
        global.QRBackupFilePath = process.platform == "win32" ? process.env.USERPROFILE + "\\Documents\\QRLink\\qrcodes.jsonc" : "/srv/QRLink/qrcodes.jsonc";
        // create the backup file/folders if they don't exist
        if (!fs.existsSync(global.QRBackupFilePath)) {
            fs.mkdirSync(process.platform == "win32" ? global.QRBackupFilePath.split("\\").slice(0, -1).join("\\") : global.QRBackupFilePath.split("/").slice(0, -1).join("/"), { recursive: true });
            fs.writeFileSync(global.QRBackupFilePath, JSON.stringify({}));
        }
        global.mongoConnectionString = process.env.MONGO_URL ? `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_URL}/${process.env.MONGO_USE_TLS=="true" ? "?tls=true" : ""}` : "mongodb://qrlink:unknown@localhost:27017/"
        console.log("[QL] Connection String: " + global.mongoConnectionString.replace(process.env.MONGO_PASSWORD, "[REDACTED]"))
        // Check if the database is accessible
        if (process.env.MONGO_URL && process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
            console.log("[QL] Attempting to connect to the database at " + process.env.MONGO_URL + " (barebones)...");
            await bareBonesConnection(global.mongoConnectionString).catch(async (information) => {
                if (information == "not_accessible") {
                console.log("[QL] Failed to connect to the database at " + process.env.MONGO_URL + ". Using file storage method.")
                return false
                } else if (information == "creds_req") {
                    try {
            
                        console.log("[QL] Attempting to connect to the database with credentials...");
                        // Attempt to connect using valid credentials
                        const client = new MongoClient(global.mongoConnectionString, {
                            serverSelectionTimeoutMS: 1000,
                            connectTimeoutMS: 1000
                        });
                        
                        const succeeded = await client.db().admin().listDatabases().catch((a) => a).then((a) => a)
            
                        if (succeeded instanceof MongoError) {
                            console.error(succeeded)
                            console.log("[QL] Failed to connect to the database at " + process.env.MONGO_URL + ". Using file storage method.")
                            return false
                        }
            
                        
                        console.log(`[DB] Successfully connected, checking if the database is set up correctly...`)
                        await ensureDBSetup(client)
                        console.log(`[QL] Connection to the database at ${process.env.MONGO_URL} was established. Switching storage method to 'mongo'.`)
                        global.storageMethod = "mongo"
                        global.mongoClient = client
                        return true
                    } catch (e) {
                        console.error(e)
                        console.log(`[QL] Failed to connect to the database at ${process.env.MONGO_URL}. Using file storage method.`)
                        return false
                    }
                }
            })
        } else {
            // if no username or password
            if ((!process.env.MONGO_USERNAME || !process.env.MONGO_PASSWORD) && process.env.MONGO_URL) {
                console.log("[QL] No username or password provided, this is a MAJOR security risk. Using file storage method.")
            } else {
                // nothing provided
                if (!process.env.MONGO_URL) {
                    console.log("[QL] No MongoDB URL provided, using file storage method.")
                }
            }
        }
        global.QRCodeTable = await readQRCodeTable()
        
        await convertFile2MongoDB()


        if (process.env.NODE_ENV == "production") { 
            //! Skip doing this in development, so we don't somehow overload WorkOS/AuthKit
            console.log("[QL] Removing QR-codes that have a non-existing user linked to them... (background)");
            let allLinkedIDs = Object.values(global.QRCodeTable as QRCodeTable).map(a=>a.linked_to)
            let uniqueLinkedIDs = allLinkedIDs.filter((a, b) => allLinkedIDs.indexOf(a) === b)
            //! Cache all users, so that we don't call AuthKit for every single user
            await fetchUsersCache().then((amountOfUsers)=>{
                console.log("[JWT] Cached " + amountOfUsers + " users.")
            })
            for (let linked_user_id of uniqueLinkedIDs) {
                doesUserExist(linked_user_id).then((exists) => {
                    if (!exists) {
                        console.log("[JWT] User with ID '"+linked_user_id+"' does not exist.")
                        for (let key of Object.keys(global.QRCodeTable)) {
                            if (global.QRCodeTable[key].linked_to == linked_user_id) {
                                delete global.QRCodeTable[key]
                                console.log("[QL] Removed QR-code " + key + " as it was linked to a non-existing user. (ID: " + linked_user_id + ")")
                            }
                        }
                    } else console.log("[JWT] User with ID '"+linked_user_id+"' does not exist.")
                })
            }
        }
            
        console.log("[QL] Checking validity of QR-codes...")
        for (let qrcode of Object.values(global.QRCodeTable)) {
            if (qrcode.hasLocationRequirement() && process.env.API_URL.startsWith("http://")) {
                console.warn("[QL] Warning: QR-code " + qrcode.id + " has a location requirement, but the API is running on HTTP. This will not work on iOS.")
            }
        }

        console.log("[QL] QRLink is ready to accept requests.");
        process.on("beforeExit", async () => {
            if (global.mongoClient) {
                console.log("[API] Closing MongoDB connection...")
                await global.mongoClient.close(true).catch(()=>{})
            } else if (global.storageMethod == "file") {
                console.log("[API] Saving QRCodeTable to file...")
                await saveQR()
            }
        
        })
    }
}