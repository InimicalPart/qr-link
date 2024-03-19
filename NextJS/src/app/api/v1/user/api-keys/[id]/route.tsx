import { QRLinkGlobal } from "@/types/api/v1/global";
import { generateAPIToken, getIDFromAPIToken, getUser } from "@/utilities/api/v1/authentication";
import { deleteAPIKey, updateAPIKeyName } from "@/utilities/api/v1/database";
import moment from "moment-timezone";
import { NextRequest, NextResponse } from "next/server";

declare const global: QRLinkGlobal

export async function GET(request: NextRequest, {params}: {params: {id: string}}) {
    //! Get an API key (token is required, and the key must belong to the user), if token is an API key, the "id" must be @me or the API key's ID, and then return the name and id of the key

    const token = request.headers.get("Authorization")
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const user = await getUser(token, {
        verify: (response) => !response.isAPIKey || response.id === params.id || params.id === "@me"
    })
    if (!user.isAuthenticated) {
        if (user.reason) {
            switch (user.reason) {
                case "failed_verify":
                    return new NextResponse(JSON.stringify({
                        error: "NOT_ALLOWED",
                        message: "This API key is not allowed to view the API key with ID " + params.id
                    }), { status: 403, headers: { "Content-Type": "application/json" } });
            }
        }
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    if (token.startsWith("Bearer ")) {
        const APIID = await getIDFromAPIToken(token)
        if (params.id === "@me" || params.id === APIID) {
            const APIDetails = global.APIKeyTable[APIID]
            return new NextResponse(JSON.stringify({
                id: APIDetails.id,
                name: APIDetails.name,
                created_at: APIDetails.created ? APIDetails.created : null,
                last_used: APIDetails.last_used ? APIDetails.last_used : null,
                permissions: APIDetails.permissions,
                token: token.replace("Bearer ","").substring(0, 7) + "..." + token.replace("Bearer ","").substring(token.replace("Bearer ","").length - 7, token.replace("Bearer ","").length)
            }), { status: 200, headers: { "Content-Type": "application/json" } });
        } else {
            if (Object.keys(global.APIKeyTable).includes(params.id)) {
                return new NextResponse(JSON.stringify({
                    error: "NOT_ALLOWED",
                    message: "This API key is not allowed to view the API key with ID " + params.id
                }), { status: 403, headers: { "Content-Type": "application/json" } });
            }
        }
    } else {
        if (!Object.keys(global.APIKeyTable).includes(params.id)) {
            return new NextResponse(JSON.stringify({
                error: "INVALID_ID",
                message: "Invalid ID provided in request."
            }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (global.APIKeyTable[params.id].belongs_to !== user.user.id) {
            return new NextResponse(JSON.stringify({
                error: "UNAUTHORIZED",
                message: "You are not authorized to view this API key."
            }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        const APIToken = await generateAPIToken(params.id)
        return new NextResponse(JSON.stringify({
            id: params.id,
            name: global.APIKeyTable[params.id].name,
            created: global.APIKeyTable[params.id].created ? global.APIKeyTable[params.id].created : null,
            last_used: global.APIKeyTable[params.id].last_used ? global.APIKeyTable[params.id].last_used : null,
            permissions: global.APIKeyTable[params.id].permissions,
            token: APIToken.substring(0, 7) + "..." + APIToken.substring(APIToken.length - 7, APIToken.length)

        }), { status: 200, headers: { "Content-Type": "application/json" } });
    
    }

}

export async function DELETE(request: NextRequest, {params}: {params: {id: string}}) {
    //! Delete an API key (token is required, and the key must belong to the user)

    const token = request.headers.get("Authorization")
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const user = await getUser(token, {
        required_permission: "api:delete-self",
        verify: (response) => !response.isAPIKey || response.id === (params.id == "@me" ? response.id : params.id) // if the response is an API key, it must be the same as the one being deleted
    })
    if (!user.isAuthenticated) {
        if (user.reason) {
            switch (user.reason) {
                case "failed_verify":
                    return new NextResponse(JSON.stringify({
                        error: "NOT_ALLOWED",
                        message: "This API key is not allowed to delete the API key with ID " + params.id
                    }), { status: 401, headers: { "Content-Type": "application/json" } });
                case "invalid_perms":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_PERMISSIONS",
                        message: "The token provided does not have the required permissions to access this resource."
                    }), { status: 403, headers: { "Content-Type": "application/json" } });
            }
        }
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const { id } = (params.id === "@me" && token.startsWith("Bearer ") ? {id: await getIDFromAPIToken(token)}: params);

    if (!global.APIKeyTable[id]) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_ID",
            message: "Invalid ID provided in request."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (global.APIKeyTable[id].belongs_to !== user.user.id) {
        return new NextResponse(JSON.stringify({
            error: "UNAUTHORIZED",
            message: "You are not authorized to delete this API key."
        }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    await deleteAPIKey(id)
    return new NextResponse(JSON.stringify({
        id,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function PATCH(request: NextRequest, {params}: {params: {id: string}}) {
    //! Update an API key (token is required, and the key must belong to the user, only updateable field is 'name')
    
    const token = request.headers.get("Authorization")
    if (!token) {
        return new NextResponse(JSON.stringify({
            error: "NO_TOKEN",
            message: "No token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const user = await getUser(token, {
        required_permission: "api:update-self",
        verify: (response) => !response.isAPIKey || response.id === (params.id == "@me" ? response.id : params.id) // if the response is an API key, it must be the same as the one being updated
    })
    if (!user.isAuthenticated) {
        if (user.reason) {
            switch (user.reason) {
                case "failed_verify":
                    return new NextResponse(JSON.stringify({
                        error: "NOT_ALLOWED",
                        message: "This API key is not allowed to update the API key with ID " + params.id
                    }), { status: 403, headers: { "Content-Type": "application/json" } });
                case "invalid_perms":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_PERMISSIONS",
                        message: "The token provided does not have the required permissions to access this resource."
                    }), { status: 403, headers: { "Content-Type": "application/json" } });
                }
        }
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token provided in request."
        }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_JSON",
            message: "Invalid JSON provided.",
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    let { name } = body;

    if (params.id === "@me" && token.startsWith("Bearer ")) {
        params.id = await getIDFromAPIToken(token)
    }

    if (!global.APIKeyTable[params.id]) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_ID",
            message: "Invalid ID provided in request."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (global.APIKeyTable[params.id].belongs_to !== user.user.id) {
        return new NextResponse(JSON.stringify({
            error: "UNAUTHORIZED",
            message: "You are not authorized to update this API key."
        }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    if (name && name.trim().length > 75) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_NAME",
            message: "Name too long, must be 75 characters or less."
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    name = name.trim() == "" ? null : name.trim()

    await updateAPIKeyName(params.id, name)
    return new NextResponse(JSON.stringify({
        id:params.id,
        name
    }), { status: 200, headers: { "Content-Type": "application/json" } });
}