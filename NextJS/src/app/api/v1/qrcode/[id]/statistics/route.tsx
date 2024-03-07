import { QRLinkGlobal } from "@/types/api/v1/global";
import { getUser, resolveID } from "@/utilities/api/v1/authentication";
import moment from "moment-timezone";
import { NextRequest, NextResponse } from "next/server";

declare const global: QRLinkGlobal

export async function GET(request: NextRequest, {params}:{params:{id:string}}) {

    const { id } = params
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      }), { status: 400 });
    }
    
    const token = request.headers.get("Authorization")
    
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401 })
    }

    const qrcode = global.QRCodeTable[id]

    const user = await getUser(token)
    if (!user.isAuthenticated) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401 })
    }

    if (qrcode.linked_to !== user.user.id) {
        return new NextResponse(JSON.stringify({
            error: "UNAUTHORIZED",
            message: "You are not authorized to view the statistics for this QRCode."
        }), { status: 403 })
    }


    const query = request.nextUrl.searchParams

    const type = query.get("type")
    const period = query.get("period") // optional
    const timezone = query.get("timezone") ?? moment.tz.guess()


    if (!type) {
        return new NextResponse(JSON.stringify({
            error: "NO_TYPE",
            message: "No type provided in request."
        }), { status: 400 })
    }

    if (!["ScannedEachX", "ScannedLastX", "ScannedWhere", "Scanned", "ScannedDayRank", "ScannedTimeRank"].includes(type)) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_TYPE",
            message: "Invalid type provided in request."
        }), { status: 400 })
    }


    const statistics = await qrcode.getStatistics(type as "ScannedEachX" | "ScannedLastX" | "ScannedWhere" | "Scanned" | "ScannedDayRank"|"ScannedTimeRank", period as "minute" | "hour" | "day" | "week" | "month" | "year" | undefined, timezone)

    if ((statistics as {error:string,message:string}).error) {
        return new NextResponse(JSON.stringify({
            error: (statistics as {error:string,message:string}).error,
            message: (statistics as {error:string,message:string}).message
        }), { status: 500 })
    }



    return new NextResponse(JSON.stringify({
        statistics
    }), { status: 200, headers: { "Content-Type": "application/json" } })





}