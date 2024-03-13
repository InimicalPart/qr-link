import { QRLinkGlobal } from "@/types/api/v1/global";
declare const global: QRLinkGlobal
import { getUser } from "@/utilities/api/v1/authentication";
import { saveQR } from "@/utilities/api/v1/database";
import { QRCode, Types } from "@/utilities/api/v1/qrcode";
import { checkDataValidity } from "@/utilities/api/v1/update";
import crypto from "crypto";
import moment from "moment-timezone";
import { NextRequest, NextResponse } from "next/server";
import QRCodeGenerator from "qrcode";

export async function POST(request: NextRequest): Promise<NextResponse> {
    // return new NextResponse("This is the 'qrcode' module.");
    //   Get user-specified ID, or generate one
    let body = null 
    try {
        body = await request.json();
    } catch (e) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_JSON",
            message: "Invalid JSON provided.",
        }), {status:400});
    }

    // if any property is null, delete it
    for (const key in body) {
        if (body[key] === null) {
            delete body[key]
        }
    }


    let { id, update_key } = {
        ...{
            id: crypto.randomUUID(),
            update_key: await randomString(32),
        },
        ...(body as Partial<{ id: string; update_key: string }>),
    };
    const { type, data, name, description, settings } = body;
    let { expires } = body;
    const token = request.headers.get("Authorization");
    

    // Check if ID is valid
    if (!(typeof (id as any) == "string")) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_ID",
            message: "ID needs to be a string.",
        }), {status:400});
    }
    
    if (!/^[a-zA-Z0-9_.-]*$/.test(id)) return new NextResponse(JSON.stringify({error: "INVALID_ID", message: "'id' can only contain alphanumeric characters, underscores and dashes and periods."}), {status:400});

    // Check if ID is already in use, as well as if it's user-specified, if both are true, return an error, otherwise, if it's only in use, generate a new ID until it is not in use
    while (global.QRCodeTable[id]) {
        if ((await request.json()).id) {
            return new NextResponse(JSON.stringify({
                error: "ID_IN_USE",
                message: "ID already in use.",
            }), {status:400});
        }
        id = crypto.randomUUID();
    }


    // Check if update key is valid
    if (!(typeof (update_key as any) == "string")) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_UPDATE_KEY",
            message: "update_key needs to be a string.",
        }), {status:400});
    }

    let identifier = undefined
    if (token) {
        // check if token is valid
        if (!(typeof (token as any) == "string")) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_TOKEN",
                message: "Token needs to be a string.",
            }), {status:400});
        }
        let tokenVerificationResult = await getUser(token)
        if (!tokenVerificationResult.isAuthenticated) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_TOKEN",
                message: "Invalid token.",
            }), {status:400});
        }
        
        identifier = tokenVerificationResult.user.id
    }

    // Check if type is valid
    if (!type) {
        return new NextResponse(JSON.stringify({
            error: "NO_TYPE",
            message: "No type provided.",
        }),{status:400});
    }
    if (!(typeof (type as any) == "string")) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_TYPE",
            message: "Type needs to be a string.",
        }),{status:400});
    }
    if (!global.supportedTypes.includes(type)) {
        return new NextResponse(JSON.stringify({
            error: "UNSUPPORTED_TYPE",
            message:
            "Type not supported. Supported types: " + global.supportedTypes.join(", "),
        }), {status: 400});
    }
    if (name) {
        if (!(typeof (name as any) == "string")) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_NAME",
                message: "Name needs to be a string.",
            }),{status:400});
        }
        // no longer than 50
        if (name.length > 50) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_NAME",
                message: "Name needs to be less than 50 characters.",
            }),{status:400});
        }
    }
    if (description) {
        if (!(typeof (description as any) == "string")) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_DESCRIPTION",
                message: "Description needs to be a string.",
            }), {status:400});
        }
        // no longer than 200
        if (description.length > 200) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_DESCRIPTION",
                message: "Description needs to be less than 200 characters.",
            }), {status:400});
        }
    }
    
    // Check if data is valid
    if (!data) {
        return new NextResponse(JSON.stringify({
            error: "NO_DATA",
            message: "No data provided.",
        }), {status:400});
    }
    const dataValidity = await checkDataValidity(type, data, id);
    if (!dataValidity.valid) {
        return new NextResponse(JSON.stringify({
            error: dataValidity.error,
            message: dataValidity.message,
        }), {status:400});
    }
    

    if (expires) {
        // needs to be a date or null
        if (
            ((new Date(expires) as any) == "Invalid Date" ||
            !(typeof (expires as any) == "string")) &&
            expires != null
            ) {
                return new NextResponse(JSON.stringify({
                    error: "INVALID_EXPIRES",
                    message: "expires needs to be a date or null.",
                }), {status:400});
            }

        if (body.timezone) {   
            // Adjust to server's timezone
            expires = moment.tz(new Date(expires).toISOString().replace(/:[0-9]{2}\.[0-9]{3}Z.*$/gm, ""), body.timezone).toDate()
        } else {
            expires = new Date(expires)
        }
    }
        
    if (settings) {
        // has to be an object
        if (!(typeof (settings as any) == "object")) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_SETTINGS",
                message: "settings needs to be an object.",
            }), {status:400});
        }
        // if settings.scanData.sendToURL is true, settings.scanData.JWTEncryptionKey needs to be a string and not empty
        if (settings.scanData.sendToURL) {
            if (
                !(typeof (settings.scanData.JWTEncryptionKey as any) == "string") ||
                settings.scanData.JWTEncryptionKey == ""
                ) {
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_JWT_ENCRYPTION_KEY",
                        message: "JWTEncryptionKey needs to be a string and not empty.",
                    }), {status:400});
                }
        }
        
    }
        
    
    global.QRCodeTable[id] = new QRCode({
        type,
        data: (dataValidity.newData ?? data) as unknown as Types.RedirectQRCodeData | Types.ScheduleQRCodeData | Types.LocationQRCodeData,
        update_key,
        created: new Date(),
        updated: new Date(),
        name: name ? name : null,
        description: description ? description : null,
        linked_to: identifier ? identifier : null,
        expires: expires ? expires : null,
        scanCount: 0,
        scanData: [],
        settings: {
            getScanData: settings?.getScanData ?? true,
            scanData: {
                information: {
                    fingerprint: settings?.scanData?.information?.fingerprint ?? false,
                    "user-agent": settings?.scanData?.information["user-agent"] ?? false,
                    ip: settings?.scanData?.information?.ip ?? false,
                    location: settings?.scanData?.information?.location ?? false,
                },
                sendToURL: settings?.scanData?.sendToURL ?? false,
                JWTEncryptionKey: settings?.scanData?.JWTEncryptionKey ?? "",
            },
            requirements: {
                location: settings?.requirements?.location ?? false, //! Warning, this does not work on iOS when running on localhost, because it's a http:// request, and iOS does not allow sending location data over http:// 
                "user-agent": settings?.requirements["user-agent"] ?? false,
            }
        }
    });
    
    saveQR(id, global.QRCodeTable[id])
        
    const qrcode = await QRCodeGenerator.toString(
        process.env.API_URL  + "/qrcode/" + id + "/handler",
        { type: "svg", errorCorrectionLevel: "H" }
    );
        
    return new NextResponse(JSON.stringify({
        id,
        update_key,
        type,
        data,
        svg: (qrcode as string).trim(),
    }), {status:201}); 
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