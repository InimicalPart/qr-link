import { QRLinkGlobal } from "@/types/api/v1/global";
import { getUser } from "@/utilities/api/v1/authentication";
import { deleteQR as deleteQRFromStorage, saveQR } from "@/utilities/api/v1/database";
import { QRCode2PDF } from "@/utilities/api/v1/misc";
import { validateAndDoUpdate } from "@/utilities/api/v1/update";
import { NextRequest, NextResponse } from "next/server";
import QRCodeGenerator from "qrcode";
declare const global: QRLinkGlobal

export async function GET(request: NextRequest, {params}: {params: {id: string}}) {

    const { id } = params;
    const fileExport = request.nextUrl.searchParams.get("export")
    /*
        ?export=pdf
    */
    const token = request.headers.get("Authorization");
    if (!id) {
        return new NextResponse(JSON.stringify({
            error: "NO_ID",
            message: "No ID provided.",
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!(typeof (id as any) == "string")) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_ID",
            message: "ID needs to be a string.",
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!Object.keys(global.QRCodeTable).includes(id)) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_ID",
            message: "Invalid ID provided.",
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
        // TODO: Make it so that we don't have to generate the QRCode twice
        let identifier = null
        if (token) {
            // check if token is valid
            if (!(typeof (token as any) == "string")) {
                return new NextResponse(JSON.stringify({
                    error: "INVALID_TOKEN",
                    message: "Token needs to be a string.",
                }), { status: 400, headers: { "Content-Type": "application/json" } });
            }
            
            let tokenVerificationResult = await getUser(token, {
                required_permission: "qrcode:read"
            })
            if (!tokenVerificationResult.isAuthenticated) {
                if (tokenVerificationResult.reason) {
                    switch (tokenVerificationResult.reason) {
                        case "invalid_perms":
                            return new NextResponse(JSON.stringify({
                                error: "INVALID_PERMISSIONS",
                                message: "This API token does not have the required permissions to get QRCodes.",
                            }), {status:403, headers: { "Content-Type": "application/json" } });
                        case "invalid_owner":
                            return new NextResponse(JSON.stringify({
                                error: "INVALID_OWNER",
                                message: "The owner of this API token does not exist.",
                            }), {status:400, headers: { "Content-Type": "application/json" } });
                    }
                }
                return new NextResponse(JSON.stringify({
                    error: "INVALID_TOKEN",
                    message: "Invalid token.",
                }), { status: 400, headers: { "Content-Type": "application/json" } });
            }
            identifier = tokenVerificationResult.user.id
        }
        let qrcodeCopy = JSON.parse(JSON.stringify(Object.assign({},global.QRCodeTable[id])));
        delete qrcodeCopy._id;
        if (!identifier || identifier != qrcodeCopy.linked_to) {
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
    let exportData: Partial<{
        svg: string,
        png: string,
        pdf: string
    }> = {}
    if (fileExport) {
        const exportType = (fileExport as string)?.toLowerCase() ?? "svg,png,pdf"
        let exportTypes = exportType.split(",")
        if (exportTypes.filter(a=>!["svg","png","pdf"].includes(a)).length != 0) return new NextResponse(JSON.stringify({error: "INVALID_EXPORT_TYPE", message: "Invalid export type."}), { status: 400, headers: { "Content-Type": "application/json" } });
        for (let exportType of exportTypes) {
        switch (exportType) {
            case "svg":
            exportData["svg"] = await QRCodeGenerator.toString(
                process.env.API_URL  + "/qrcode/" + id + "/handler",
                { type: "svg", errorCorrectionLevel: "H" }
            );
            break;
            case "png":
            exportData["png"] = await QRCodeGenerator.toDataURL(
                process.env.API_URL  + "/qrcode/" + id + "/handler",
                { errorCorrectionLevel: "H", width: 400}
            );
            break;
            case "pdf":
                if (!identifier || identifier != qrcodeCopy.linked_to) {
                    return new NextResponse(JSON.stringify({
                        error: "UNAUTHORIZED",
                        message: "You are not authorized to export this QR-code as a PDF. If you are the owner of this QR-code, please provide your token in the 'Authorization' header.",
                    }), { status: 401, headers: { "Content-Type": "application/json" } });
                }
                exportData["pdf"] = await QRCode2PDF(qrcodeCopy, id)
                break;
            default:
                return new NextResponse(JSON.stringify({
                    error: "INVALID_EXPORT_TYPE",
                    message: "Invalid export type: " + exportType,
                }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        }
    }

        return new NextResponse(JSON.stringify({
                id, 
            ...qrcodeCopy,
            ...exportData
        }), { status: 200, headers: { "Content-Type": "application/json" } });
}
export async function PATCH(request: NextRequest, {params}: {params: {id: string}}) {

    let requestBody = null
    try {
        requestBody = await request.json();
    } catch (e) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_JSON",
            message: "Invalid JSON provided.",
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    let update = requestBody
    let { id } = params;
    if (!id) {
      return new NextResponse(JSON.stringify({
        error: "NO_ID",
        message: "No ID provided.",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!(typeof (id as any) == "string")) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "ID needs to be a string.",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const token = request.headers.get("Authorization")
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const user = await getUser(token, {
        required_permission: "qrcode:update"
    })
    if (!user.isAuthenticated) {
        if (user.reason) {
            switch (user.reason) {
                case "invalid_perms":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_PERMISSIONS",
                        message: "This API token does not have the required permissions to update a QRCode.",
                    }), {status:403, headers: { "Content-Type": "application/json" } });
                case "invalid_owner":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_OWNER",
                        message: "The owner of this API token does not exist.",
                    }), {status:400, headers: { "Content-Type": "application/json" } });
            }
        }
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
  
    if (!update) {
      return new NextResponse(JSON.stringify({
        error: "NO_UPDATE",
        message: "No update provided.",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  
    // update needs to be an object
    if (!(typeof (update as any) == "object")) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_UPDATE",
        message: "update needs to be an object.",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  
    if (Object.keys(update).filter((key) => !global.supportedUpdateKeys.includes(key)).length != 0) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ARGUMENTS",
        message: "Invalid arguments provided: " + Object.keys(update).filter((key) => !global.supportedUpdateKeys.includes(key)).join(", "),
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const timezone = update.timezone ?? null
    delete update.timezone
    const wasAnytingUpdated = await validateAndDoUpdate(id, update, timezone)
    if (wasAnytingUpdated instanceof NextResponse) {
        //! validateAndDoUpdate had an error
        return wasAnytingUpdated
    }
    if (!wasAnytingUpdated) {
      return new NextResponse(JSON.stringify({
          id,
          type: global.QRCodeTable[id].type,
          data: global.QRCodeTable[id].data,
          linked_to: global.QRCodeTable[id].linked_to,
          expires: global.QRCodeTable[id].expires,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    saveQR(id, global.QRCodeTable[update.id??id], true)
    
    let additionalInformation = {};
    if (update.id && update.id != id) {
      additionalInformation = {
          ...additionalInformation,
          message: "You have changed the ID of this QR-code. Keep in mind that this means that the old ID will no longer work, and that you will have to update the QR-code everywhere you have used it.",
          warning: "ID_CHANGE_WARNING",
          new_id: update.id,
      }
    }
    return new NextResponse(JSON.stringify({
      ...{
        id,
        type: global.QRCodeTable[id].type,
        data: global.QRCodeTable[id].data,
        linked_to: global.QRCodeTable[id].linked_to,
        expires: global.QRCodeTable[id].expires,
      },
      ...additionalInformation,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  
}


export async function DELETE(request: NextRequest, {params}: {params: {id: string}}) {
    let { id } = params;
    if (!id) {
      return new NextResponse(JSON.stringify({
        error: "NO_ID",
        message: "No ID provided.",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!(typeof (id as any) == "string")) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "ID needs to be a string.",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const token = request.headers.get("Authorization")
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const user = await getUser(token, {
        required_permission: "qrcode:delete"
    })
    if (!user.isAuthenticated) {
        if (user.reason) {
            switch (user.reason) {
                case "invalid_perms":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_PERMISSIONS",
                        message: "This API token does not have the required permissions to delete a QRCode.",
                    }), {status:403, headers: { "Content-Type": "application/json" } });
                case "invalid_owner":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_OWNER",
                        message: "The owner of this API token does not exist.",
                    }), {status:400, headers: { "Content-Type": "application/json" } });
            }
        }
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    if (global.QRCodeTable[id].linked_to !== user.user.id) {
        return new NextResponse(JSON.stringify({
            error: "UNAUTHORIZED",
            message: "You are not authorized to delete this QRCode."
        }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    delete global.QRCodeTable[id]
    deleteQRFromStorage(id)
    return new NextResponse(JSON.stringify({
        id,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
}