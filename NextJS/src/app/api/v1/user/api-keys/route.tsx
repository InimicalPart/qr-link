import { QRLinkGlobal } from "@/types/api/v1/global";
import { generateAPIToken, getUser } from "@/utilities/api/v1/authentication";
import { createAPIKey } from "@/utilities/api/v1/database";
import moment from "moment-timezone";
import { NextRequest, NextResponse } from "next/server";

declare const global: QRLinkGlobal

export async function GET(request:NextRequest) {
    //! Get all API keys belonging to the user (found in the token. token is required)

    const token = request.headers.get("Authorization")
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const user = await getUser(token, {
        allowAPIKey: false
    })
    if (!user.isAuthenticated) {
        if (user.reason) {
            switch (user.reason) {
                case "api_key":
                    return new NextResponse(JSON.stringify({
                        error: "NOT_ALLOWED",
                        message: "API keys are not allowed for this request."
                    }), { status: 401, headers: { "Content-Type": "application/json" } });
                }
        }
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const timezone = request.nextUrl.searchParams.get("timezone") ?? moment.tz.guess()

    let UsersAPIKeys = Object.keys(global.APIKeyTable).filter((id) => global.APIKeyTable[id].belongs_to === user.user.id)
    const protectedKeys = []
    for (let APIKey of UsersAPIKeys) {
        const APIToken = await generateAPIToken(APIKey)
        protectedKeys.push({
            id: APIKey,
            token_preview: APIToken.substring(0, 7) + "..." + APIToken.substring(APIToken.length - 7, APIToken.length),
            name: global.APIKeyTable[APIKey].name,
            created: moment(global.APIKeyTable[APIKey].created).tz(timezone).format("YYYY-MM-DD HH:mm:ss.SSS\\Z"),
            last_used: moment(global.APIKeyTable[APIKey].last_used).tz(timezone).format("YYYY-MM-DD HH:mm:ss.SSS\\Z"),
            permissions: global.APIKeyTable[APIKey].permissions
        })
    }

    return new NextResponse(JSON.stringify({
        keys: protectedKeys
    }), { status: 200, headers: { "Content-Type": "application/json" } });
}
export async function POST(request: NextRequest) {
    //! Create a new API key (token is required)
    const token = request.headers.get("Authorization")
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const user = await getUser(token, {
        allowAPIKey: false
    })
    if (!user.isAuthenticated) {
        if (user.reason) {
            switch (user.reason) {
                case "api_key":
                    return new NextResponse(JSON.stringify({
                        error: "NOT_ALLOWED",
                        message: "API keys are not allowed for this request."
                    }), { status: 401, headers: { "Content-Type": "application/json" } });
                }
        }
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    let body;
    try {
        body = await request.json()
    } catch {
        return new NextResponse(JSON.stringify({
            error: "INVALID_BODY",
            message: "Invalid body provided in request."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    let { permissions } = body
    if (!permissions) {
        return new NextResponse(JSON.stringify({
            error: "NO_PERMISSIONS",
            message: "No permissions provided in request."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    //! At least one permission is required
    if (permissions.length === 0) {
        return new NextResponse(JSON.stringify({
            error: "NO_PERMISSIONS",
            message: "At least one permission is required."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    //! Check if permissions are valid, ("create","read","update","delete")
    if (!permissions.every((permission: APIKeyPermissions) => [
        "qrcode:create",
        "qrcode:read",
        "qrcode:update",
        "qrcode:delete",
        "api:update-self",
        "api:delete-self",
    ].includes(permission))) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_PERMISSIONS",
            message: "Invalid permissions provided in request."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const details = await createAPIKey(body.name??null, user.user.id, permissions)
    const APIToken = await generateAPIToken(details.id)
    console.log(APIToken)
    const timezone = request.nextUrl.searchParams.get("timezone") ?? moment.tz.guess()
    return new NextResponse(JSON.stringify({
        id: details.id,
        name: details.name,
        token: APIToken,
        created: moment(details.created).tz(timezone).format("YYYY-MM-DD HH:mm:ss.SSS\\Z"),
        last_used: null,
        permissions: details.permissions
    }), { status: 200, headers: { "Content-Type": "application/json" } });

}
