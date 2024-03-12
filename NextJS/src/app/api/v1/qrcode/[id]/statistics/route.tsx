import { QRLinkGlobal } from "@/types/api/v1/global";
import { getUser, resolveID } from "@/utilities/api/v1/authentication";
import moment from "moment-timezone";
import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

declare const global: QRLinkGlobal

export async function GET(request: NextRequest, {params}:{params:{id:string}}) {

    //TODO: REMOVE
    if (process.env.NODE_ENV == "production") {
        return notFound()
    }

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
    const multiplier = query.get("period_length") // optional // 1 (Month), 3 (Weeks)
    const period = query.get("period_unit") // optional // (1) Month, (3) Weeks
    const timezone = query.get("timezone") ?? moment.tz.guess()
    const wantedFields = query.get("fields")?.split(",") // optional


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


    const statistics = await qrcode.getStatistics({
        type,
        time: period,
        multiplier: multiplier ? parseInt(multiplier) : 1,
        timezone,
        onlyFields: wantedFields
    
    })

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