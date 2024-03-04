import { QRLinkGlobal } from "@/types/api/v1/global";
import { saveQR } from "@/utilities/api/v1/database";
import { NextRequest, NextResponse } from "next/server";
declare const global: QRLinkGlobal


export async function POST(request: NextRequest, {params}:{params:{id:string}}): Promise<NextResponse> {
    const { id } = params;
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
    if (global.QRCodeTable[id].expires && global.QRCodeTable[id].expires < new Date()) {
        return new NextResponse(JSON.stringify({
            error: "EXPIRED",
            message: "QR-code has expired.",
          }), { status: 400 });
    }
    if (!global.QRCodeTable[id].settings.getScanData) {
        return new NextResponse(JSON.stringify({
            error: "SCAN_DATA_NOT_ENABLED",
            message: "Scan data is not enabled for this QR-code.",
          }), { status: 400 });
    }
    let requestBody = null
    try {
        requestBody = await request.json();
    } catch (e) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_JSON",
            message: "Invalid JSON provided.",
        }), { status: 400 });
    }
    if (global.QRCodeTable[id].settings.requirements.location && !requestBody?.location) {
        return new NextResponse(JSON.stringify({
            error: "NO_LOCATION",
            message: "Location is required for this QR-code.",
          }), { status: 400 });
    }
    if (global.QRCodeTable[id].settings.requirements.location && (!requestBody?.location?.latitude || !requestBody?.location?.longitude || !requestBody?.location?.accuracy)) {
        return new NextResponse(JSON.stringify({
            error: "NO_LOCATION",
            message: "Location is required for this QR-code.",
          }), { status: 400 });
    }
    if ((typeof requestBody?.location?.latitude != "number" || typeof requestBody?.location?.longitude != "number" || typeof requestBody?.location?.accuracy != "number")) {
        if (global.QRCodeTable[id].settings?.requirements?.location) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_LOCATION",
                message: "Invalid location data.",
            }), { status: 400 });
        } else {
            requestBody.location = null
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

    if (global.QRCodeTable[id].settings.scanData.information.fingerprint) scanData["fingerprint"] = requestBody.fingerprint
    if (global.QRCodeTable[id].settings.scanData.information["user-agent"]) scanData["user-agent"] = request.headers.get("user-agent")
    if (global.QRCodeTable[id].settings.scanData.information.timestamp) scanData["timestamp"] = new Date()
    if (global.QRCodeTable[id].settings.scanData.information.ip) scanData["ip"] = requestBody.ip ?? request.ip
    if (global.QRCodeTable[id].settings.scanData.information.location) scanData["location"] = requestBody.location


    global.QRCodeTable[id].scanCount++;
    global.QRCodeTable[id].scanData.push(scanData)
    saveQR(id, global.QRCodeTable[id], true)
    console.log("[QRCode] ScanData for QR-code " + id + " was submitted.");
    return new NextResponse(null, { status: 204 });

}