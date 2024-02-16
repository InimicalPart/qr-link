import { QRCodeInformation } from "@/types/api/v1/QRCode";
import { getUser } from "./authentication";

import moment from "moment-timezone";
import { QRLinkGlobal } from "@/types/api/v1/global";
import { NextResponse } from "next/server";

declare const global: QRLinkGlobal;

interface UpdateInformation extends Partial<QRCodeInformation> {
    id?: string;
}

export async function validateUpdate(id: string, update: Partial<UpdateInformation>) {
    let wasAnytingUpdated = false;
    for (let key of Object.keys(update)) {
        switch (key) {
            case "type":
                if (global.QRCodeTable[id].type == update.type) break;
                
                //! Needs to be supported
                /* prettier-ignore */
                if (!global.supportedTypes.includes(update.type)) return new NextResponse(JSON.stringify({error: "UNSUPPORTED_TYPE", message: "Type not supported. Supported types: " + global.supportedTypes.join(", ")}), {status:400});
                //! Needs to contain a valid data object
                if (!update.data) return new NextResponse(JSON.stringify({ error: "NO_DATA", message: "No data provided." }), {status:400});
                if (!(typeof (update.data as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_DATA", message: "'update.data' needs to be an object.",}), {status:400});
                const dataValidity = await checkDataValidity(update.type, update.data, id, true);
                //! Return error if data is invalid for specified type
                if (!dataValidity.valid) return new NextResponse(JSON.stringify({ error: dataValidity.error, message: dataValidity.message }), {status:400});
                
                if (update.data.redirect_to) {
                    update.data.redirect_to = update.data.redirect_to.trim();
                }
                
                global.QRCodeTable[id].type = update.type;
                global.QRCodeTable[id].data = {...global.QRCodeTable[id].data,...update.data};
                wasAnytingUpdated = true;
                break;
        case "data":
            if (Object.keys(update).includes("type")) break; //! handled by 'case "type"'
            if (JSON.stringify(global.QRCodeTable[id].data) == JSON.stringify({...global.QRCodeTable[id].data,...update.data})) break; //! no need to update if data is the same
            
            //! Needs to be an object
            if (!(typeof (update.data as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_DATA", message: "'update.data' needs to be an object.",}), {status:400});
            //! Needs to be valid for specified type
            const dataValidity2 = await checkDataValidity(global.QRCodeTable[id].type, update.data, id, true);
            if (!dataValidity2.valid) return new NextResponse(JSON.stringify({error: dataValidity2.error, message: dataValidity2.message }), {status:400});
            
            if (update.data.redirect_to) {
                update.data.redirect_to = update.data.redirect_to.trim();
            }
            
            global.QRCodeTable[id].data = {...global.QRCodeTable[id].data,...update.data};
            wasAnytingUpdated = true;
            break;
        case "update_key":
            if (global.QRCodeTable[id].update_key == update.update_key) break; //! no need to update if update_key is the same
            
            //! Needs to be a string
            if (!(typeof (update.update_key as any) == "string")) return new NextResponse(JSON.stringify({error: "INVALID_UPDATE_KEY", message: "'update.update_key' needs to be a string."}), {status:400});
            
            global.QRCodeTable[id].update_key = update.update_key;
            wasAnytingUpdated = true;
            break;
        case "linked_to":
            
            //! Needs to be a string
            if (!(typeof (update.linked_to as any) == "string")) return new NextResponse(JSON.stringify({error: "INVALID_LINKED_TO", message: "'update.linked_to' needs to be a string."}), {status:400});
            
            let token = update.linked_to
            let tokenVerificationResult = await getUser(token)
            if (!tokenVerificationResult.isAuthenticated) {
                return new NextResponse(JSON.stringify({
                    error: "INVALID_LINKED_TO",
                    message: "Invalid token.",
                }), {status:400});
            }
            if (global.QRCodeTable[id].linked_to == tokenVerificationResult.user.id) break; //! no need to update if linked_to is the same
            global.QRCodeTable[id].linked_to = tokenVerificationResult.user.id;
    
            wasAnytingUpdated = true;
            break;
    case "expires":
        if (global.QRCodeTable[id].expires == update.expires) break; //! no need to update if expires is the same
        
        //! Needs to be a date or null
        if (((new Date(update.expires) as any) == "Invalid Date" || !(typeof (update.expires as any) == "string")) && update.expires != null) return new NextResponse(JSON.stringify({error: "INVALID_EXPIRES", message: "'update.expires' needs to be a date or null."}), {status:400});
        
        global.QRCodeTable[id].expires = update.expires;
        wasAnytingUpdated = true;
        break;
    case "id":
        if (id == update.id) break; //! no need to update if id is the same
        
        //! Needs to be a string
        if (!(typeof (update.id as any) == "string")) return new NextResponse(JSON.stringify({error: "INVALID_ID", message: "'update.id' needs to be a string."}), {status:400});
        
        if (!/^[a-zA-Z0-9_.-]*$/.test(update.id)) return new NextResponse(JSON.stringify({error: "INVALID_ID", message: "'update.id' can only contain alphanumeric characters, underscores and dashes and periods."}), {status:400});
        
        
        //! Needs to be a valid ID
        if (global.QRCodeTable[update.id]) return new NextResponse(JSON.stringify({error: "ID_IN_USE", message: "ID already in use."}), {status:400});
        
        global.QRCodeTable[update.id] = global.QRCodeTable[id];
        delete global.QRCodeTable[id];
        id = update.id;
        wasAnytingUpdated = true;
        break;
    case "description":
        if (global.QRCodeTable[id].description == update.description) break; //! no need to update if description is the same
        
        //! Needs to be a string
        if (!(typeof (update.description as any) == "string")) return new NextResponse(JSON.stringify({error: "INVALID_DESCRIPTION", message: "'update.description' needs to be a string."}), {status:400});
        
        //! no longer than 200
        if (update.description.length > 200) return new NextResponse(JSON.stringify({error: "INVALID_DESCRIPTION", message: "Description needs to be less than 200 characters."}), {status:400});
        
        global.QRCodeTable[id].description = update.description;
        wasAnytingUpdated = true;
        break;
    case "name":
        if (global.QRCodeTable[id].name == update.name) break; //! no need to update if name is the same
        
        //! Needs to be a string
        if (!(typeof (update.name as any) == "string")) return new NextResponse(JSON.stringify({error: "INVALID_NAME", message: "'update.name' needs to be a string."}), {status:400});
        
        //! no longer than 50
        if (update.name.length > 50) return new NextResponse(JSON.stringify({error: "INVALID_NAME", message: "Name needs to be less than 50 characters."}), {status:400});
        
        global.QRCodeTable[id].name = update.name;
        wasAnytingUpdated = true;
        break;
    case "settings":
        //! Needs to be an object
        if (!(typeof (update.settings as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings' needs to be an object."}), {status:400});
        
        if (JSON.stringify(global.QRCodeTable[id].settings) == JSON.stringify(update.settings)) break; //! no need to update if settings are the same
        
        //settings cannot be empty
        if (Object.keys(update.settings).length == 0) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings' cannot be empty."}), {status:400});
        
        //! Needs to be a valid settings object
        if (update.settings.getScanData) {
            //! Needs to be a boolean
            if (!(typeof (update.settings.getScanData as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.getScanData' needs to be a boolean."}), {status:400});
        }
        if (update.settings.scanData) {
            //! Needs to be an object
            if (!(typeof (update.settings.scanData as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.scanData' needs to be an object."}), {status:400});
            //! Needs to be a valid scanData object
            if (update.settings.scanData.fingerprint) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData.fingerprint as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.scanData.fingerprint' needs to be a boolean."}), {status:400});
            }
            if (update.settings.scanData["user-agent"]) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData["user-agent"] as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.scanData.user-agent' needs to be a boolean."}), {status:400});
            }
            if (update.settings.scanData.timestamp) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData.timestamp as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.scanData.timestamp' needs to be a boolean."}), {status:400});
            }
            if (update.settings.scanData.ip) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData.ip as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.scanData.ip' needs to be a boolean."}), {status:400});
            }
            if (update.settings.scanData.location) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.scanData.location as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.scanData.location' needs to be a boolean."}), {status:400});
            }
        }
        if (update.settings.requirements) {
            //! Needs to be an object
            if (!(typeof (update.settings.requirements as any) == "object")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.requirements' needs to be an object."}), {status:400});
            //! Needs to be a valid requirements object
            if (update.settings.requirements.location) {
                //! Needs to be a boolean
                if (!(typeof (update.settings.requirements.location as any) == "boolean")) return new NextResponse(JSON.stringify({error: "INVALID_SETTINGS", message: "'update.settings.requirements.location' needs to be a boolean."}), {status:400});
            }
        }
        global.QRCodeTable[id].settings = {
            getScanData: update.settings.getScanData ?? global.QRCodeTable[id].settings.getScanData,
            scanData: {
                fingerprint: update.settings.scanData?.fingerprint ?? global.QRCodeTable[id].settings.scanData.fingerprint,
                "user-agent": update.settings.scanData?.["user-agent"] ?? global.QRCodeTable[id].settings.scanData["user-agent"],
                timestamp: update.settings.scanData?.timestamp ?? global.QRCodeTable[id].settings.scanData.timestamp,
                ip: update.settings.scanData?.ip ?? global.QRCodeTable[id].settings.scanData.ip,
                location: update.settings.scanData?.location ?? global.QRCodeTable[id].settings.scanData.location,
            },
            requirements: {
                location: update.settings.requirements?.location ?? global.QRCodeTable[id].settings.requirements.location, //! Warning, this currently does not work on iOS, as it does not like to share location data with http:// websites, will be fixed when we move to https://
            }
        }
        wasAnytingUpdated = true;
        break;
                                default:
                                    return new NextResponse(JSON.stringify({
                                        error: "INVALID_UPDATE",
                                    message: "Invalid update.",
                                    }), {status:400});
        
    }
}
}
export async function checkDataValidity(
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
      if (data.schedule && (data.redirect_to || data.after_expiry || data.location)) {
          return {
              valid: false,
              error: "NOT_VALID_DATA",
              message: "'schedule' cannot be provided with either 'redirect_to', 'after_expiry' or 'location'.",
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
              if (global.QRCodeTable[id]?.data?.schedule && takeAction) {
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
                // If redirect_to is not specified in both global.QRCodeTable[id].data and update data, return an error
              if (!data?.redirect_to && !global.QRCodeTable[id].data.redirect_to) {
                  return {
                      valid: false,
                      error: "INVALID_AFTER_EXPIRY",
                      message: "after_expiry requires redirect_to to be specified.",
                  };
              }
              // If a schedule exists, remove it
              if (global.QRCodeTable[id]?.data?.schedule && takeAction) {
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
  
              if ((global.QRCodeTable[id]?.data?.after_expiry || global.QRCodeTable[id]?.data?.redirect_to) && takeAction) {
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
            case "location":
                const zones = data.location
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
              break
            default:
              console.log(key);
              return {
                valid: false,
                error: "INVALID_DATA",
                message: "Invalid data.",
              };
          }
        }
          if (del.schedule) delete global.QRCodeTable[id].data.schedule
          if (del.redirect_to) delete global.QRCodeTable[id].data.redirect_to
          if (del.after_expiry) delete global.QRCodeTable[id].data.after_expiry
        return { valid: true };
      default:
        return { valid: false, error: "INVALID_TYPE", message: "Invalid type." };
    }
  }