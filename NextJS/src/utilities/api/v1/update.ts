import { QRCode, Types } from "./qrcode";
import { getUser } from "./authentication";

import moment from "moment-timezone";
import { QRLinkGlobal } from "@/types/api/v1/global";
import { NextResponse } from "next/server";



declare const global: QRLinkGlobal;


/**
 * Check the validity of the data object for a specified type and return a new data object if necessary
 * @param id The ID of the QRCode
 * @param update The update that needs to be checked
 * @param doUpdate Whether to actually update the QRCode or just check the validity
 * @returns An object with the updated fields, or null if no fields were updated
 */
export async function validateAndDoUpdate(id: string, update: Partial<QRCode>, doUpdate: boolean = true) {
    let updated: Partial<QRCode> = {}
    for (let key of Object.keys(update)) {
        switch (key) {
            case "type":
                if (id && global.QRCodeTable[id].type == update.type) break;
                
                //! Needs to be supported
                /* prettier-ignore */
                if (!global.supportedTypes.includes(update.type)) return new NextResponse(JSON.stringify({error: "UNSUPPORTED_TYPE", message: "Type not supported. Supported types: " + global.supportedTypes.join(", ")}), {status: 400, headers: { "Content-Type": "application/json" } });
                //! Needs to contain a valid data object
                if (!update.data) return new NextResponse(JSON.stringify({ error: "NO_DATA", message: "No data provided." }), {status: 400, headers: { "Content-Type": "application/json" } });
                if (!(typeof (update.data as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_DATA", message: "'data' needs to be an object.",}), {status: 400, headers: { "Content-Type": "application/json" } });
                const dataValidity = await checkDataValidity(update.type, update.data, id);
                //! Return error if data is invalid for specified type
                if (!dataValidity.valid) return new NextResponse(JSON.stringify({ error: dataValidity.error, message: dataValidity.message }), {status: 400, headers: { "Content-Type": "application/json" } });
                updated.type = update.type;
                updated.data = (dataValidity.newData??update.data) as unknown as Types.RedirectQRCodeData | Types.ScheduleQRCodeData | Types.LocationQRCodeData;
                break;
            case "data":
                if (id && Object.keys(update).includes("type") && global.QRCodeTable[id].type != update.type) break; //! handled by 'case "type"'
                if (id && JSON.stringify(global.QRCodeTable[id].data) == JSON.stringify({...global.QRCodeTable[id].data,...update.data})) break; //! no need to update if data is the same
                
                //! Needs to be an object
                if (!(typeof (update.data as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_DATA", message: "'data' needs to be an object.",}), {status: 400, headers: { "Content-Type": "application/json" } });
                //! Needs to be valid for specified type
                const dataValidity2 = await checkDataValidity(global.QRCodeTable[id].type, update.data, id);
                if (!dataValidity2.valid) return new NextResponse(JSON.stringify({error: dataValidity2.error, message: dataValidity2.message }), {status: 400, headers: { "Content-Type": "application/json" } });
                updated.data = (dataValidity2.newData??update.data) as unknown as Types.RedirectQRCodeData | Types.ScheduleQRCodeData | Types.LocationQRCodeData;
                break;
            case "linked_to":
                
                //! Needs to be a string
                if (!(typeof (update.linked_to as any) == "string")) return new NextResponse(JSON.stringify({error: "INVALID_LINKED_TO", message: "'linked_to' needs to be a string."}), {status: 400, headers: { "Content-Type": "application/json" } });
                
                let token = update.linked_to
                let tokenVerificationResult = await getUser(token)
                if (!tokenVerificationResult.isAuthenticated) {
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_LINKED_TO",
                        message: "Invalid token.",
                    }), {status: 400, headers: { "Content-Type": "application/json" } });
                }
                if (id && global.QRCodeTable[id].linked_to == tokenVerificationResult.user.id) break; //! no need to update if linked_to is the same
                updated.linked_to = tokenVerificationResult.user.id;
                break;
            case "expires":
                if (id && global.QRCodeTable[id].expires == update.expires) break; //! no need to update if expires is the same

                //! Needs to be a date or null
                if (((new Date(update.expires) as any) == "Invalid Date" || !(typeof (update.expires as any) == "string")) && update.expires != null) return new NextResponse(JSON.stringify({error: "INVALID_EXPIRES", message: "'expires' needs to be a date or null."}), {status: 400, headers: { "Content-Type": "application/json" } });

                updated.expires = update.expires;
                break;
            case "description":
                if (id && global.QRCodeTable[id].description == update.description) break; //! no need to update if description is the same
                
                //! Needs to be a string
                if (!(typeof (update.description as any) == "string")) return new NextResponse(JSON.stringify({error: "INVALID_DESCRIPTION", message: "'description' needs to be a string."}), {status: 400, headers: { "Content-Type": "application/json" } });
                
                //! no longer than 200
                if (update.description.length > 200) return new NextResponse(JSON.stringify({error: "INVALID_DESCRIPTION", message: "Description needs to be less than 200 characters."}), {status: 400, headers: { "Content-Type": "application/json" } });
                
                updated.description = update.description;
                break;
            case "name":
                if (id && global.QRCodeTable[id].name == update.name) break; //! no need to update if name is the same
                
                //! Needs to be a string
                if (!(typeof (update.name as any) == "string")) return new NextResponse(JSON.stringify({error: "INVALID_NAME", message: "'name' needs to be a string."}), {status: 400, headers: { "Content-Type": "application/json" } });
                
                //! no longer than 50
                if (update.name.length > 50) return new NextResponse(JSON.stringify({error: "INVALID_NAME", message: "Name needs to be less than 50 characters."}), {status: 400, headers: { "Content-Type": "application/json" } });
                
                updated.name = update.name;
                break;
            case "settings":
                //! Needs to be an object
                if (!(typeof (update.settings as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings' needs to be an object."}), {status: 400, headers: { "Content-Type": "application/json" } });
                
                if (id && JSON.stringify(global.QRCodeTable[id].settings) == JSON.stringify(update.settings)) break; //! no need to update if settings are the same
                //settings cannot be empty
                if (Object.keys(update.settings).length == 0) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings' cannot be empty."}), {status: 400, headers: { "Content-Type": "application/json" } });
                
                //! Needs to be a valid settings object
                if (update.settings.getScanData) {
                    //! Needs to be a boolean
                    if (!(typeof (update.settings.getScanData as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.getScanData' needs to be a boolean."}), {status: 400, headers: { "Content-Type": "application/json" } });
                }
                if (update.settings.scanData) {
                    //! Needs to be an object
                    if (!(typeof (update.settings.scanData as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.scanData' needs to be an object."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    //! Needs to be a valid scanData object
                    if (update.settings.scanData.information.fingerprint) {
                        //! Needs to be a boolean
                        if (!(typeof (update.settings.scanData.information.fingerprint as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.scanData.information.fingerprint' needs to be a boolean."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    }
                    if (update.settings.scanData.information["user-agent"]) {
                        //! Needs to be a boolean
                        if (!(typeof (update.settings.scanData.information["user-agent"] as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.scanData.information.user-agent' needs to be a boolean."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    }
                    if (update.settings.scanData.information.ip) {
                        //! Needs to be a boolean
                        if (!(typeof (update.settings.scanData.information.ip as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.scanData.information.ip' needs to be a boolean."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    }
                    if (update.settings.scanData.information.location) {
                        //! Needs to be a boolean
                        if (!(typeof (update.settings.scanData.information.location as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.scanData.information.location' needs to be a boolean."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    }
                }
                if (update.settings.requirements) {
                    //! Needs to be an object
                    if (!(typeof (update.settings.requirements as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.requirements' needs to be an object."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    //! Needs to be a valid requirements object
                    if (update.settings.requirements.location) {
                        //! Needs to be a boolean
                        if (!(typeof (update.settings.requirements.location as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.requirements.location' needs to be a boolean."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    }
                    if (update.settings.requirements["user-agent"]) {
                        //! Needs to be a boolean
                        if (!(typeof (update.settings.requirements["user-agent"] as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.requirements.user-agent' needs to be a boolean."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    }
                }
                if (update.settings.scanData.sendToURL == true) {
                    // needs to also contain a valid JWT encryption key if sendToURL is true
                    //! JWTEncryptionKey needs to be provided or already defined
                    if (!update.settings.scanData.JWTEncryptionKey && (id && !global.QRCodeTable[id].settings.scanData.JWTEncryptionKey)) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.scanData.JWTEncryptionKey' needs to be provided."}), {status: 400, headers: { "Content-Type": "application/json" } });
                    //! Needs to be a string and not empty
                    if (!(typeof (update.settings.scanData.JWTEncryptionKey as any) == "string") || update.settings.scanData.JWTEncryptionKey.trim() == "") return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'settings.scanData.JWTEncryptionKey' needs to be a non-empty string."}), {status: 400, headers: { "Content-Type": "application/json" } });
                }



                // only add updated fields to the updated object and remove unchanged fields
                if (doUpdate)
                updated.settings = JSON.parse(JSON.stringify({
                    getScanData: update.settings.getScanData == global.QRCodeTable[id].settings.getScanData ? undefined : update.settings.getScanData ?? undefined,
                    scanData: {
                        information: {
                            fingerprint: update.settings.scanData?.information?.fingerprint == global.QRCodeTable[id].settings.scanData.information.fingerprint ? undefined : update.settings.scanData?.information?.fingerprint ?? undefined,
                            "user-agent": update.settings.scanData?.information?.["user-agent"] == global.QRCodeTable[id].settings.scanData.information["user-agent"] ? undefined : update.settings.scanData?.information?.["user-agent"] ?? undefined,
                            ip: update.settings.scanData?.information?.ip == global.QRCodeTable[id].settings.scanData.information.ip ? undefined : update.settings.scanData?.information?.ip ?? undefined,
                            location: update.settings.scanData?.information?.location == global.QRCodeTable[id].settings.scanData.information.location ? undefined : update.settings.scanData?.information?.location ?? undefined,
                        },
                        sendToURL: update.settings.scanData?.sendToURL == global.QRCodeTable[id].settings.scanData.sendToURL ? undefined : update.settings.scanData?.sendToURL ?? undefined,
                        JWTEncryptionKey: update.settings.scanData?.JWTEncryptionKey == global.QRCodeTable[id].settings.scanData.JWTEncryptionKey ? undefined : update.settings.scanData?.JWTEncryptionKey ?? undefined,
                    },
                    requirements: {
                        location: update.settings.requirements?.location == global.QRCodeTable[id].settings.requirements.location ? undefined : update.settings.requirements?.location ?? undefined,
                        "user-agent": update.settings.requirements?.["user-agent"] == global.QRCodeTable[id].settings.requirements["user-agent"] ? undefined : update.settings.requirements?.["user-agent"] ?? undefined,
                    }
                }))
                break;
            default:
                return new NextResponse(JSON.stringify({
                    error: "INVALID_PROPERTY",
                    message: "Invalid property: " + key,
                }), {status: 400, headers: { "Content-Type": "application/json" } });
        }
    }
    if (doUpdate) {
        if (updated.id) {
            global.QRCodeTable[updated.id] = global.QRCodeTable[id]
            delete global.QRCodeTable[id]
            id = updated.id
        }

        if (Object.keys(JSON.parse(JSON.stringify(updated as any))).length > 0) {
            global.QRCodeTable[id].update(JSON.parse(JSON.stringify(updated as any)))
        }
    }
    return Object.keys(updated).length > 0 ? updated : null
}

/**
 * Checks if the data is valid for the 'redirect' type
 * @param data The data to check
 * @param id The ID of the QRCode
 * @returns An object with a boolean 'valid' and a 'newData' object if the data is valid, or an error message if the data is invalid
 */
async function checkRedirectDataValidity(data: Types.RedirectQRCodeData, id: string) {

    if (!data.redirect_to) {
        return {
            valid: false,
            error: "INVALID_REDIRECT",
            message: "Redirect URL needs to be specified.",
        };
    }


    if (!(typeof (data.redirect_to as any) == "string")) {
        return {
        valid: false,
        error: "INVALID_REDIRECT",
        message: "Redirect URL needs to be a string.",
        };
    }

    if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(data.redirect_to)) {
        return {
            valid: false,
            error: "INVALID_REDIRECT",
            message: "Redirect URL needs to be a valid URL or a vCard.",
        };
    }

    if (data.after_expiry) {
        if (!(typeof (data.after_expiry as any) == "string")) {
            return {
                valid: false,
                error: "INVALID_AFTER_EXPIRY",
                message: "after_expiry URL needs to be a string.",
            };
        }

        if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(data.after_expiry)) {
            return {
                valid: false,
                error: "INVALID_AFTER_EXPIRY",
                message: "After expiry URL needs to be a valid URL or a vCard.",
            };
        }

        // If redirect_to is not specified in both global.QRCodeTable[id].data and update data, return an error
        if (!data?.redirect_to && !(global.QRCodeTable[id].data as Types.RedirectQRCodeData).redirect_to) {
            return {
                valid: false,
                error: "INVALID_AFTER_EXPIRY",
                message: "after_expiry requires redirect_to to be specified.",
            };
        }
    }


    if (data.redirect_to) data.redirect_to = data.redirect_to.trim()
    if (data.after_expiry) data.after_expiry = data.after_expiry.trim()


    return { valid: true, newData: (data as unknown as Types.Data) };
}

/**
 * Checks if the data is valid for the 'schedule' type
 * @param data The data to check
 * @param id The ID of the QRCode
 * @returns An object with a boolean 'valid' and a 'newData' object if the data is valid, or an error message if the data is invalid
 */
async function checkScheduleDataValidity(data: Types.ScheduleQRCodeData | null, id: string) {
    
    if (!(typeof (data as any) == "object")) {
        return {
          valid: false,
          error: "INVALID_SCHEDULE",
          message: "schedule needs to be an object.",
        };
    }

    let invalid_parameters = Object.keys(data).filter((key) => !["monday","tuesday","wednesday","thursday","friday","saturday","sunday", "timezone"].includes(key))
    if (invalid_parameters.length != 0) {
        return {
          valid: false,
          error: "INVALID_SCHEDULE",
          message: "Invalid schedule parameters: " + invalid_parameters.join(", "),
        };
    }

    // needs at least 1 day
    if (Object.keys(data).length < 2) {
        return {
          valid: false,
          error: "INVALID_SCHEDULE",
          message: "At least one day is required.",
        };
    }

    //each parameter needs to be an object, and has to contain at least 2 keys in the HH:MM(:SS) format (keys result to objects), or 1 key called "ALL_DAY" (also an object)
    for (let day of (Object.keys(data) as Array<keyof typeof data>)) {
        if (day == "timezone") {
            if (!moment.tz.zone(data.timezone)) {
                return {
                  valid: false,
                  error: "INVALID_SCHEDULE",
                  message: "Invalid timezone: " + data.timezone,
                };
            }
            continue;
        }
        if (!(typeof (data[day] as any) == "object")) {
            return {
              valid: false,
              error: "INVALID_SCHEDULE",
              message: "'schedule." + day + "' needs to be an object.",
            };
        }
        if (Object.keys(data[day]).length == 0) {
            
            return {
              valid: false,
              error: "INVALID_SCHEDULE",
              message: "'schedule." + day + "' needs to contain one 'ALL_DAY' key, or at least 2 keys in the HH:MM(:SS) format, but not both.",
            };
        }

        if (Object.keys(data[day]).length == 1 && !Object.keys(data[day]).includes("ALL_DAY") && Object.keys(data).length==1) {
            return {
              valid: false,
              error: "INVALID_SCHEDULE",
              message: "'schedule." + day + "' needs to contain one 'ALL_DAY' key, or at least 2 keys in the HH:MM(:SS) format, but not both.",
            };
        }

        if (Object.keys(data[day]).length > 1 && Object.keys(data[day]).includes("ALL_DAY")) {
            return {
              valid: false,
              error: "INVALID_SCHEDULE",
              message: "'schedule." + day + "' needs to contain one 'ALL_DAY' key, or at least 2 keys in the HH:MM(:SS) format, but not both.",
            };
        }

        // if (Object.keys(data[day]).filter((key)=>/[0-9]{2}:[0-9]{2}(:[0-9]{2}|)/g.test(key)).length < 2 && !Object.keys(data[day]).includes("ALL_DAY")) {
        //     console.log("TEST-D")
        //     console.log(Object.keys(data[day]))
        //     console.log(Object.keys(data[day]).filter((key)=>/[0-9]{2}:[0-9]{2}(:[0-9]{2}|)/g.test(key)))
        //     return {
        //       valid: false,
        //       error: "INVALID_SCHEDULE",
        //       message: "'schedule." + day + "' needs to contain one 'ALL_DAY' key, or at least 2 keys in the HH:MM(:SS) format, but not both.",
        //     };
        // } 

        for (let time of Object.keys(data[day])) {
            if (!(typeof (data[day][time] as any) == "object")) {
                return {
                    valid: false,
                    error: "INVALID_SCHEDULE",
                    message: "'schedule." + day + "." + time + "' needs to be an object.",
                };
            }
            for (let key of Object.keys(data[day][time]) as Array<keyof typeof data["monday"]["00:00"]>) {
                if (!["redirect_to","after_expiry"].includes(key)) {
                    return {
                        valid: false,
                        error: "INVALID_SCHEDULE",
                        message: "'schedule." + day + "." + time + "' can only contain 'redirect_to' and 'after_expiry'.",
                    };
                }
                if (!(typeof (data[day][time][key] as any) == "string")) {
                    return {
                      valid: false,
                      error: "INVALID_SCHEDULE",
                      message: "'schedule." + day + "." + time + "." + key + "' needs to be a string.",
                    };
                }

                if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(data[day][time][key])) {
                    return {
                      valid: false,
                      error: "INVALID_SCHEDULE",
                      message: "'schedule." + day + "." + time + "." + key + "' needs to be a valid URL or a vCard.",
                    };
                }
            }
        }
    }

    for (let day of (Object.keys(data)as Array<keyof typeof data>)) {
        if (day == "timezone") continue;
        for (let time of Object.keys(data[day])) {
            if (data[day][time].redirect_to) data[day][time].redirect_to = data[day][time].redirect_to.trim()
            if (data[day][time].after_expiry) data[day][time].after_expiry = data[day][time].after_expiry.trim()
        }
    }

    return { valid: true, newData: (data as unknown as Types.Data) };
}

/**
 * Checks if the data is valid for the 'location' type
 * @param data The data to check
 * @param id The ID of the QRCode
 * @returns An object with a boolean 'valid' and a 'newData' object if the data is valid, or an error message if the data is invalid
 */
export async function checkLocationDataValidity(data: Types.LocationQRCodeData, id: string) {

    const zones = data.zones
    if (zones.length < 1) {
        return {
            valid: false,
            error: "INVALID_LOCATION",
            message: "At least one zone is required.",
        };
    }

    // at least 2 zones
    if (zones.length == 1 && zones[0].isEntireWorld) {
        return {
            valid: false,
            error: "INVALID_LOCATION",
            message: "Your only zone cannot be the entire world.",
        }
    }

    if (zones.some((zone: { redirectTo: any; }) => !zone.redirectTo)) {
        return {
            valid: false,
            error: "INVALID_LOCATION",
            message: "All zones need to have a redirectTo.",
        }
    }

    for (let zoneIndex in zones) {
        let zone = zones[zoneIndex]
        //zone.type has to be either circle or polygon
        if (zone.type != "circle" && zone.type != "polygon") {
            return {valid:false, error: "INVALID_LOCATION",message:"Zone "+(zoneIndex+1)+"'s type must be either 'circle' or 'polygon'."}
        }
        // zone.redirectTo has to be a valid URL or a vCard and cannot be empty
        if (zone.redirectTo == "" || !zone.redirectTo) {
            return {valid:false, error: "INVALID_LOCATION",message:"Zone "+(zoneIndex+1)+"'s 'Redirect To' must be a valid URL or a vCard."}
        }
        if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(zone.redirectTo)) {
            return {
                valid:false,
                error: "INVALID_LOCATION",
                message:"Zone "+(zoneIndex+1)+"'s 'Redirect To' must be a valid URL or a vCard."
            }
        }
        // zone.afterExpiry has to be a valid URL or a vCard, but can be empty
        if (zone.afterExpiry != "" && zone.afterExpiry) {
            if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(zone.afterExpiry)) {
                return {
                    valid:false, error: "INVALID_LOCATION", message:"Zone "+(zoneIndex+1)+"'s 'After Expiry' must be a valid URL or a vCard."}
            }
        }

        // if type is circle, zone.radius has to be a number and zone.center has to be an array of 2 numbers
        if (zone.type == "circle") {
            if (typeof zone.radius != "number") {
                return {
                    valid:false, error: "INVALID_LOCATION",
                    message:"Zone "+(zoneIndex+1)+"'s radius must be a number."};
            }
            if (!Array.isArray(zone.center) || zone.center.length != 2 || typeof zone.center[0] != "number" || typeof zone.center[1] != "number") {
                return {
                    valid:false, error: "INVALID_LOCATION",
                    message:"Zone "+(zoneIndex+1)+"'s center must be an array of 2 numbers."};
                }
        }
        // if type is polygon, zone.positions has to be an array of arrays of 2 numbers
        else if (zone.type == "polygon") {
            if (!Array.isArray(zone.positions) || zone.positions.length < 3) {
                return {
                    valid:false, error: "INVALID_LOCATION",
                    message:"Zone "+(zoneIndex+1)+"'s positions must be an array of at least 3 arrays of 2 numbers."};
            }
            for (let positionIndex in zone.positions) {
                let position = zone.positions[positionIndex]
                if (!Array.isArray(position) || position.length != 2 || typeof position[0] != "number" || typeof position[1] != "number") {
                   return {valid:false, error:"INVALID_LOCATION", message:"Zone "+(zoneIndex+1)+"'s point with index "+positionIndex+" must be an array of 2 numbers."};
                }
            }
        }
    }

    for (let zoneIndex in data.zones) {
        if (data.zones[zoneIndex].redirectTo) data.zones[zoneIndex].redirectTo = data.zones[zoneIndex].redirectTo.trim()
        if (data.zones[zoneIndex].afterExpiry) data.zones[zoneIndex].afterExpiry = data.zones[zoneIndex].afterExpiry.trim()
    }

    return { valid: true, newData: (data as unknown as Types.Data) };
}

/**
 * Checks if the data is valid for the 'user-agent' type
 * @param data The data to check
 * @param id The ID of the QRCode
 * @returns An object with a boolean 'valid' and a 'newData' object if the data is valid, or an error message if the data is invalid
 */
export async function checkUserAgentDataValidity(data: Types.UserAgentQRCodeData, id: string) {
    for (let userAgentInfo of data.userAgents) {

        // .os, .os_name, .browser, .browser_name, are required, *_name should be less than 20 characters, .os/.browser should be less than 50 characters, everything should be a string
        if (!userAgentInfo.os || !userAgentInfo.os_name || !userAgentInfo.browser || !userAgentInfo.browser_name) {
            return {
                valid: false,
                error: "INVALID_USER_AGENT",
                message: "User agent needs to have os, os_name, browser, and browser_name properties.",
            }
        }
        if (userAgentInfo.os.length > 50 || userAgentInfo.browser.length > 50 || userAgentInfo.os_name.length > 20 || userAgentInfo.browser_name.length > 20) {
            return {
                valid: false,
                error: "INVALID_USER_AGENT",
                message: "User agent's os and browser properties need to be less than 50 characters, and os_name and browser_name properties need to be less than 20 characters.",
            }
        }
        if (!(typeof (userAgentInfo.os as any) == "string") || !(typeof (userAgentInfo.os_name as any) == "string") || !(typeof (userAgentInfo.browser as any) == "string") || !(typeof (userAgentInfo.browser_name as any) == "string")) {
            return {
                valid: false,
                error: "INVALID_USER_AGENT",
                message: "User agent's os, os_name, browser, and browser_name properties need to be strings.",
            }
        }
        

        if (!userAgentInfo.redirect_to) {
            return {
                valid: false,
                error: "INVALID_USER_AGENT",
                message: "User agent with browser '" + userAgentInfo.browser_name + "' and OS '" + userAgentInfo.os_name + "' needs to have a redirect_to property.",
            }
        }
        if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(userAgentInfo.redirect_to)) {
            return {
                valid: false,
                error: "INVALID_USER_AGENT",
                message: "User agent with browser '" + userAgentInfo.browser_name + "' and OS '" + userAgentInfo.os_name + "' needs to have a valid redirect_to property.",
            }
        }
        if (userAgentInfo.after_expiry) {
            if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(userAgentInfo.after_expiry)) {
                return {
                    valid: false,
                    error: "INVALID_USER_AGENT",
                    message: "User agent with browser '" + userAgentInfo.browser_name + "' and OS '" + userAgentInfo.os_name + "' needs to have a valid after_expiry property.",
                }
            }
        }
    }
    return { valid: true, newData: (data as unknown as Types.Data) };

}


/**
 * Check the validity of the data object for a specified type and return a new data object if necessary
 * @param type The type of the QRCode
 * @param data The data to check
 * @param id The ID of the QRCode
 * @returns An object with a boolean 'valid' and a 'newData' object if the data is valid, or an error message if the data is invalid
 */
export async function checkDataValidity(
    type: string,
    data: any,
    id:string
  ): Promise<{ valid: boolean; error?: string; message?: string, newData?: Types.Data }> {
    switch (type) {
        case "redirect":
            return await checkRedirectDataValidity(data, id);
        case "schedule":
            return await checkScheduleDataValidity(data, id);
        case "location":
            return await checkLocationDataValidity(data, id);
        case "user-agent":
            return await checkUserAgentDataValidity(data, id);
        default:
            return { valid: false, error: "INVALID_TYPE", message: "Invalid type." };
    }
}