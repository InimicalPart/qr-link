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
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    
    const token = request.headers.get("Authorization")
    
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const qrcode = global.QRCodeTable[id]

    const user = await getUser(token,{
        required_permission: "qrcode:read"
    })
    if (!user.isAuthenticated) {
        if (user.reason) {
            switch (user.reason) {
                case "invalid_perms":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_PERMISSIONS",
                        message: "The token provided does not have the required permissions to access this resource."
                    }), { status: 403, headers: { "Content-Type": "application/json" } });
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

    if (qrcode.linked_to !== user.user.id) {
        return new NextResponse(JSON.stringify({
            error: "UNAUTHORIZED",
            message: "You are not authorized to view the statistics for this QRCode."
        }), { status: 403, headers: { "Content-Type": "application/json" } });
    }


    const query = request.nextUrl.searchParams

    const type = query.get("type")
    const multiplier = query.get("period_length") // optional // 1 (Month), 3 (Weeks)
    const period = query.get("period_unit") // optional // (1) Month, (3) Weeks
    const wantedFields = query.get("fields")?.split(",") // optional
    const timezone = query.get("timezone") ?? moment.tz.guess()


    if (!type) {
        return new NextResponse(JSON.stringify({
            error: "NO_TYPE",
            message: "No type provided in request."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (!["ScannedEachX", "ScannedLastX", "ScannedWhere", "Scanned", "ScannedDayRank", "ScannedTimeRank"].includes(type)) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_TYPE",
            message: "Invalid type provided in request."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
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
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }



    return new NextResponse(JSON.stringify({
        statistics
    }), { status: 200, headers: { "Content-Type": "application/json" } })
}