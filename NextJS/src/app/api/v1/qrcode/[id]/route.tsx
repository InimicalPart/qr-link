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
        }), { status: 400 });
    }
    if (!(typeof (id as any) == "string")) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_ID",
            message: "ID needs to be a string.",
        }), { status: 400 });
    }
    if (!Object.keys(global.QRCodeTable).includes(id)) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_ID",
            message: "Invalid ID provided.",
        }), { status: 400 });
    }
        // TODO: Make it so that we don't have to generate the QRCode twice
        let identifier = null
        if (token) {
            // check if token is valid
            if (!(typeof (token as any) == "string")) {
                return new NextResponse(JSON.stringify({
                    error: "INVALID_TOKEN",
                    message: "Token needs to be a string.",
                }), { status: 400 });
            }
            
            let tokenVerificationResult = await getUser(token)
            if (!tokenVerificationResult.isAuthenticated) {
                return new NextResponse(JSON.stringify({
                    error: "INVALID_TOKEN",
                    message: "Invalid token.",
                }), { status: 400 });
            }
            identifier = tokenVerificationResult.user.id
        }
        let qrcodeCopy = JSON.parse(JSON.stringify(Object.assign({},global.QRCodeTable[id])));
        delete qrcodeCopy._id;
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
    let exportData: Partial<{
        svg: string,
        png: string,
        pdf: string
    }> = {}
    if (fileExport) {
        const exportType = (fileExport as string)?.toLowerCase() ?? "svg,png,pdf"
        let exportTypes = exportType.split(",")
        if (exportTypes.filter(a=>!["svg","png","pdf"].includes(a)).length != 0) return new NextResponse(JSON.stringify({error: "INVALID_EXPORT_TYPE", message: "Invalid export type."}), { status: 400 })
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
                    }), { status: 401 });
                }
                exportData["pdf"] = await QRCode2PDF(qrcodeCopy, id)
                break;
            default:
                return new NextResponse(JSON.stringify({
                    error: "INVALID_EXPORT_TYPE",
                    message: "Invalid export type: " + exportType,
                }), { status: 400 });
        }
        }
    }

        return new NextResponse(JSON.stringify({
                id, 
            ...qrcodeCopy,
            ...exportData
        }), { status: 200 });

        // let pdf = await QRCode2PDF(a,"8c8435e9-f630-4008-844d-31a4c928f1b9")
        // return new Response(Buffer.from(pdf.replace("data:application/pdf;base64,",""),"base64"), {
        //     headers: {
        //         "Content-Type": "application/pdf",
        //         "Content-Disposition": `attachment; filename="qrcode_${params.id}.pdf"`
        //     }
        // })
}
export async function PATCH(request: NextRequest, {params}: {params: {id: string}}) {

    let requestBody = null
    try {
        requestBody = await request.json();
    } catch (e) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_JSON",
            message: "Invalid JSON provided.",
        }), { status: 400 });
    }

    let { update_key, update } = requestBody
    let { id } = params;
    if (!id) {
      return new NextResponse(JSON.stringify({
        error: "NO_ID",
        message: "No ID provided.",
      }), { status: 400 })
    }
    if (!(typeof (id as any) == "string")) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "ID needs to be a string.",
      }), { status: 400 })
    }
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      }), { status: 400 })
    }
    if (!update_key) {
      return new NextResponse(JSON.stringify({
        error: "NO_UPDATE_KEY",
        message: "No update_key provided.",
      }), { status: 400 })
    }
    if (!(typeof (update_key as any) == "string")) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_UPDATE_KEY",
        message: "update_key needs to be a string.",
      }), { status: 400 })
    }
  
    if (global.QRCodeTable[id].update_key != update_key) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_UPDATE_KEY",
        message: "Invalid update_key provided.",
      }), { status: 401 })
    }
  
    if (!update) {
      return new NextResponse(JSON.stringify({
        error: "NO_UPDATE",
        message: "No update provided.",
      }), { status: 400 })
    }
  
    // update needs to be an object
    if (!(typeof (update as any) == "object")) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_UPDATE",
        message: "update needs to be an object.",
      }), { status: 400 })
    }
  
    if (Object.keys(update).filter((key) => !global.supportedUpdateKeys.includes(key)).length != 0) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ARGUMENTS",
        message: "Invalid arguments provided: " + Object.keys(update).filter((key) => !global.supportedUpdateKeys.includes(key)).join(", "),
      }), { status: 400 })
    }
    const wasAnytingUpdated = await validateAndDoUpdate(id, update, request.nextUrl.searchParams.get("timezone"))
    if (wasAnytingUpdated instanceof NextResponse) {
        return wasAnytingUpdated
    }
    if (!wasAnytingUpdated) {
      return new NextResponse(JSON.stringify({
          id,
          type: global.QRCodeTable[id].type,
          data: global.QRCodeTable[id].data,
          linked_to: global.QRCodeTable[id].linked_to,
          expires: global.QRCodeTable[id].expires,
      }), { status: 200 });
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
    }), { status: 200 });
  
}


export async function DELETE(request: NextRequest, {params}: {params: {id: string}}) {
    let { id } = params;
    if (!id) {
      return new NextResponse(JSON.stringify({
        error: "NO_ID",
        message: "No ID provided.",
      }), { status: 400 })
    }
    if (!(typeof (id as any) == "string")) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "ID needs to be a string.",
      }), { status: 400 })
    }
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      }), { status: 400 })
    }
    const token = request.headers.get("Authorization")
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401 })
    }
    const user = await getUser(token)
    if (!user.isAuthenticated) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401 })
    }
    if (global.QRCodeTable[id].linked_to !== user.user.id) {
        return new NextResponse(JSON.stringify({
            error: "UNAUTHORIZED",
            message: "You are not authorized to delete this QRCode."
        }), { status: 403 })
    }
    delete global.QRCodeTable[id]
    deleteQRFromStorage(id)
    return new NextResponse(JSON.stringify({
        id,
        message: "The QR-code has been deleted."
    }), { status: 200 });
}