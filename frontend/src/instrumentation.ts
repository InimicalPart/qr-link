import { QRLinkGlobal } from "@/types/api/v1/global"
import { QRCodeTable } from "@/types/api/v1/QRCode"
import QRCodeGenerator from "qrcode";
import {MongoClient, MongoError} from "mongodb";
import { bareBonesConnection, convertFile2MongoDB, ensureDBSetup, readQRCodeTable } from "./utilities/api/v1/database";


declare const global: QRLinkGlobal

export async function register(){
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
    global.supportedTypes = ["redirect"];
    global.storageMethod = "file";
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
    }
    global.QRCodeTable = await readQRCodeTable()
    
    await convertFile2MongoDB()

}