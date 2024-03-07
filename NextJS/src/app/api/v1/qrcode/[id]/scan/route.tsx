import { QRLinkGlobal } from "@/types/api/v1/global";
import { saveQR } from "@/utilities/api/v1/database";
import { NextRequest, NextResponse } from "next/server";
declare const global: QRLinkGlobal


export async function POST(request: NextRequest, {params}:{params:{id:string}}): Promise<NextResponse> {
    return new NextResponse(
        JSON.stringify({
            deprecated: true,
            error: "This route is deprecated, this endpoint has been replaced by GET /api/v1/qrcode/"+params.id+"/handler"
        }),
        { status: 410, headers: { "Content-Type": "application/json" } }
    )
}