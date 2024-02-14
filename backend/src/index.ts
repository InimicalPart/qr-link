import express from "express";
import cors from "cors";
import moment from "moment-timezone";
import {config} from "dotenv";

import crypto from "crypto";
import QRCodeGenerator from "qrcode";
import {MongoClient, MongoError} from "mongodb";
config();
import {QRCodeData } from "./types/QRCode"
import { bareBonesConnection, readQRCodeTable, saveQR, ensureDBSetup, convertFile2MongoDB } from "./utilities/database";
import { QRCode2PDF, generateTrackingCode, getPassedTime, randomString } from "./utilities/misc";
import { getUser } from "./utilities/authentication";
import { supportedTypes, supportedUpdateKeys } from "./utilities/static";
import { validateUpdate, checkDataValidity } from "./utilities/update";
// variables not to be changed
const mongoConnectionString = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_URL}/${process.env.MONGO_ENABLE_TLS ? "?tls=true" : ""}`; //TODO: enable TLS
global.mongoClient = null
console.log("[DQ] QRLink is starting up...");

(async () => {
global.storageMethod = "file";
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
            global.storageMethod = "mongo"
            global.mongoClient = client
            return true
        } catch (e) {
            console.error(e)
            console.log(`[DQ] Failed to connect to the database at ${process.env.MONGO_URL}. Using file storage method.`)
            return false
        }
      }
    })
}
global.QRCodeTable = await readQRCodeTable()

await convertFile2MongoDB()

global.serverURL = (process.env.API_URL ?? "http://localhost:3000").replace(/:[0-9]{1,5}/g, "")
global.port = parseInt((process.env.API_URL ?? "http://localhost:3000").replace(/.*:/g, ""))
const api = express();

//TODO: REMOVE LATER!!
api.use(cors());
api.use(express.json());





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
  const qrcodekeys = Object.keys(global.QRCodeTable).filter((key) => {
    return global.QRCodeTable[key].linked_to == identifier;
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
          global.serverURL + ":" + global.port  + "/qrcode/" + qrcodekey + "/handler",
          { type: "svg", errorCorrectionLevel: "H" }
        );
        break;
      case "png":
        exportData["png"] = await QRCodeGenerator.toDataURL(
          global.serverURL + ":" + global.port  + "/qrcode/" + qrcodekey + "/handler",
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
      ...global.QRCodeTable[qrcodekey],
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
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      return res.status(400).send({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      });
    }
    if (global.QRCodeTable[id].expires && global.QRCodeTable[id].expires < new Date()) {
        return res.status(400).send({
            error: "EXPIRED",
            message: "QR-code has expired.",
          });
    }
    if (!global.QRCodeTable[id].settings.getScanData) {
        return res.status(400).send({
            error: "SCAN_DATA_NOT_ENABLED",
            message: "Scan data is not enabled for this QR-code.",
          });
    }
    if (global.QRCodeTable[id].settings.requirements.location && !req?.body?.location) {
        return res.status(400).send({
            error: "NO_LOCATION",
            message: "Location is required for this QR-code.",
          });
    }
    if (global.QRCodeTable[id].settings.requirements.location && (!req?.body?.location?.latitude || !req?.body?.location?.longitude || !req?.body?.location?.accuracy)) {
        return res.status(400).send({
            error: "NO_LOCATION",
            message: "Location is required for this QR-code.",
          });
    }
    if ((typeof req?.body?.location?.latitude != "number" || typeof req?.body?.location?.longitude != "number" || typeof req?.body?.location?.accuracy != "number")) {
        if (global.QRCodeTable[id].settings?.requirements?.location) {
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

    if (global.QRCodeTable[id].settings.scanData.fingerprint) scanData["fingerprint"] = req.body.fingerprint
    if (global.QRCodeTable[id].settings.scanData["user-agent"]) scanData["user-agent"] = req.headers["user-agent"]
    if (global.QRCodeTable[id].settings.scanData.timestamp) scanData["timestamp"] = new Date()
    if (global.QRCodeTable[id].settings.scanData.ip) scanData["ip"] = req.body.ip ?? req.ip
    if (global.QRCodeTable[id].settings.scanData.location) scanData["location"] = req.body.location


    global.QRCodeTable[id].scanCount++;
    global.QRCodeTable[id].scanData.push(scanData)
    saveQR(id, global.QRCodeTable[id], true)
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
  while (global.QRCodeTable[id]) {
    if (req.body.id) {
      return res.status(400).send({
        error: "ID_IN_USE",
        message: "ID already in use.",
      });
    }
    id = crypto.randomUUID();
  }

  global.QRCodeTable[id] = {
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
  saveQR(id, global.QRCodeTable[id])

  const qrcode = await QRCodeGenerator.toString(
    global.serverURL + ":" + global.port  + "/qrcode/" + id + "/handler",
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
  if (!Object.keys(global.QRCodeTable).includes(id)) {
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
    let qrcodeCopy = JSON.parse(JSON.stringify(global.QRCodeTable[id]));
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
            global.serverURL + ":" + global.port  + "/qrcode/" + id + "/handler",
            { type: "svg", errorCorrectionLevel: "H" }
          );
          break;
        case "png":
          exportData["png"] = await QRCodeGenerator.toDataURL(
            global.serverURL + ":" + global.port  + "/qrcode/" + id + "/handler",
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
        serverURL: global.serverURL + ":" + global.port,
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
  if (!Object.keys(global.QRCodeTable).includes(id)) {
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

  if (global.QRCodeTable[id].update_key != update_key) {
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

  if (Object.keys(update).filter((key) => !supportedUpdateKeys.includes(key)).length != 0) {
    return res.status(400).send({
      error: "INVALID_ARGUMENTS",
      message: "Invalid arguments provided: " + Object.keys(update).filter((key) => !supportedUpdateKeys.includes(key)).join(", "),
    });
  }
  const wasAnytingUpdated = await validateUpdate(id, update, res)
  const qrcode = await QRCodeGenerator.toString(
    global.serverURL + ":" + global.port  + "/qrcode/" + id + "/handler",
    { type: "svg", errorCorrectionLevel: "H" }
  );
  if (!wasAnytingUpdated) {
    return res.status(200).send({
        id,
        type: global.QRCodeTable[id].type,
        data: global.QRCodeTable[id].data,
        linked_to: global.QRCodeTable[id].linked_to,
        expires: global.QRCodeTable[id].expires,
        svg: (qrcode as string).trim(),  
    });
  }
  global.QRCodeTable[id].updated = new Date();
  saveQR(id, global.QRCodeTable[id], true)

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
      type: global.QRCodeTable[id].type,
      data: global.QRCodeTable[id].data,
      linked_to: global.QRCodeTable[id].linked_to,
      expires: global.QRCodeTable[id].expires,
      svg: (qrcode as string).trim(),
    },
    ...additionalInformation,
  });
});

api.get("/qrcode/:id/handler", async (req, res) => {
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
  if (!Object.keys(global.QRCodeTable).includes(id)) {
    return res.status(400).send({
      error: "INVALID_ID",
      message: "Invalid ID provided.",
    });
  }
  console.log("[QRCode] QR-code was scanned: " + id);
  const { type, data } = global.QRCodeTable[id];
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
                            <title>QRLink</title>
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
  if (!global.QRCodeTable[id].settings.getScanData) {
      global.QRCodeTable[id].scanCount++; //! Only add to scanCount if we are not getting scan data
      saveQR(id, global.QRCodeTable[id], true)
  }
  if (global.QRCodeTable[id].expires) {
    if (new Date() > new Date(global.QRCodeTable[id].expires as Date)) {
      if (currentAction.after_expiry) {
        console.log("[QRCode] QR-code has expired, redirecting to: " + currentAction.after_expiry);
        res.redirect(currentAction.after_expiry);
        return;
      }
      if (req.accepts("text/html")) {
        return res.status(400).send(`
        <html>
            <head>
                <title>QRLink</title>
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
      if (global.QRCodeTable[id].settings.getScanData) {
        // if only timestamp or user-agent is requested, we can get it using express and redirect them normally
        if (Object.keys(global.QRCodeTable[id].settings.scanData).filter((key) => !["timestamp", "user-agent"].includes(key) && global.QRCodeTable[id].settings.scanData[key]).length == 0) {

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
          if (global.QRCodeTable[id].settings.scanData.timestamp) {
              finalScanData.timestamp = new Date()
          }
          if (global.QRCodeTable[id].settings.scanData["user-agent"]) {
              finalScanData["user-agent"] = req.headers["user-agent"]
          }

          global.QRCodeTable[id].scanData.push(finalScanData)
          global.QRCodeTable[id].scanCount++
          saveQR(id, global.QRCodeTable[id], true)
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

            const {body, javascript} = await generateTrackingCode(id, {
                serverURL: global.serverURL,
                port: global.port,
                currentAction,
                request: req
                
            })

            return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>QRLink</title>
            </head>
            <body>
                <p>Redirecting...</p>
                ${body}
                <script>${javascript}</script>
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


api.use(function (_req, res) {
  res.status(404).send({ error: "NOT_FOUND", message: "The requested resource could not be found on the server." });
});
process.on("beforeExit", async () => {
    if (global.mongoClient) {
        console.log("[API] Closing MongoDB connection...")
        await global.mongoClient.close().catch(()=>{})
    } else if (global.storageMethod == "file") {
        console.log("[API] Saving QRCodeTable to file...")
        await saveQR()
    }

})
api.listen(global.port, () => {
  console.log(`Server running on port ${global.port}`);
});
})()
