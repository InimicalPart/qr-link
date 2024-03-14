import { SignJWT, jwtDecrypt, jwtVerify } from "jose";
import WorkOS from "@workos-inc/node";
import { QRLinkGlobal } from "@/types/api/v1/global";
const secret = new Uint8Array(Buffer.from(process.env.JWT_SECRET, "base64"));
const workos = new WorkOS(process.env.WORKOS_API_KEY);
export const cacheValidity = 5 * 60 * 1000 //! 5 minutes



export async function resolveID(id: string): Promise<User> {
    console.log("[AUTH] Resolving ID: " + id)
    const res = await workos.userManagement.getUser(id) // This doesn't need to be cached, as it might happen that the user is not in the cache at the time of the request, and this could break things
    console.log("[AUTH] ID resolved: " + res.email)
    return res
}

declare const global: QRLinkGlobal
const strippedBaseURL = process.env.BASE_URL.replace(/(^\w+:|^)\/\//, '');


function isAPIKey(token: string) {
    return token.startsWith("Bearer ")
}


type APIVerify = {
    isAPIKey: boolean;
} & APIKey
type UserVerify = {
    isAPIKey: boolean,
    object: string,
    id: string,
    email: string,
    emailVerified: boolean,
    firstName: string | null,
    lastName: string | null,
    createdAt: Date | string,
    updatedAt: Date | string
}


export async function getIDFromAPIToken(token: string) {
    const verifiedToken = await verifyAPIToken(token)
    if (!verifiedToken) return null
    return verifiedToken.id
}

export async function updateUser(id: string, data: Partial<User>) {
    console.log("[AUTH] Updating user: " + id)
    const user = await workos.userManagement.updateUser({
        userId: id,
        ...data
    })
    console.log("[AUTH] User updated: " + id)
    const newToken = await new SignJWT({
        user,
    })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer(strippedBaseURL)
        .setAudience(strippedBaseURL)
        .setExpirationTime('1w')
        .sign(secret);


    return newToken
}

export async function getUser(token: string,options:{
    
    allowAPIKey?:boolean,
    required_permission?:APIKeyPermissions|APIKeyPermissions[],
    verify?:(res: UserVerify | APIVerify) => boolean
} = {}): Promise<{isAuthenticated: boolean, reason?: string, user?: {
    profilePictureUrl: string;object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string 
}}> {
    
    //! Set default options
    options = {
        allowAPIKey: true,
        ...options
    }
    
    if (isAPIKey(token)) {
        console.log(options)
        if (!options.allowAPIKey) {
            console.log("[AUTH] API tokens are not allowed.")
            return { isAuthenticated: false, reason: "api_key" };
        }

        if (options.required_permission && !Array.isArray(options.required_permission) && typeof options.required_permission === "string") {
            options.required_permission = [options.required_permission]
        }
        console.log("[AUTH] Verifying API token: " + token.substring(0, 10) + "..." + token.substring(token.length - 10, token.length))
        const verifiedToken = await verifyAPIToken(token)
        if (!verifiedToken) {
            console.log("[AUTH] Token is invalid.")
            return { isAuthenticated: false };
        }
        if (options.required_permission) {
            let hasPermission = (options.required_permission as string[]).every((permission) => verifiedToken.permissions.includes(permission as any))
            if (!hasPermission) {
                console.log("[AUTH] Token does not have required permission.")
                return { isAuthenticated: false, reason: "invalid_perms" };
            }
        }
        
        if (options.verify) {
            if (!options.verify({isAPIKey:true,...verifiedToken})) {
                console.log("[AUTH] Token failed external validation.")
                return { isAuthenticated: false, reason: "failed_verify" };
            }
        }

        const owner = await resolveID(verifiedToken.belongs_to) 
        if (!owner) {
            console.log("[AUTH] Token owner does not exist.")
            return { isAuthenticated: false, reason: "invalid_owner" };
        }


        console.log("[AUTH] API token is valid and belongs to user: " + owner.email)
        return {
            isAuthenticated: true,
            user: owner,
        };
    } else {
    
        console.log("[AUTH] Verifying user token: " + token.substring(0, 10) + "..." + token.substring(token.length - 10, token.length))
        let verifiedToken;
        try {
        verifiedToken = await jwtVerify(token, secret, {
            audience: strippedBaseURL,
            issuer: strippedBaseURL,
            algorithms: ["HS256"],
            requiredClaims: ["exp", "iat", "iss", "aud"],
        }) as {
            payload: {
                user: User
            }
        }
        } catch {
        console.log("[AUTH] Token is invalid.")
        return { isAuthenticated: false };
        }
    
        if (options.verify) {
            if (!options.verify({isAPIKey:false,...verifiedToken.payload.user})) {
                console.log("[AUTH] Token failed external validation.")
                return { isAuthenticated: false, reason: "failed_verify" };
            }
        }

        console.log("[AUTH] Token is valid. User: " + verifiedToken.payload.user.email)
        return {
            isAuthenticated: true,
            user: verifiedToken.payload.user,
        };
    }
  }



export async function getUsers() {
    let list = await workos.userManagement.listUsers({ limit: 100 });
    let users = list.data;
    let before = list.listMetadata.before;

    while (before) {
        list = await workos.userManagement.listUsers({
            limit: 100,
            before: before,
        });
        users = users.concat(list.data);
        before = list.listMetadata.before;
    }
    return users;
}

const cached: {
    users: {
        object:string,
        id:string,
        email: string,
        emailVerified: boolean,
        firstName: string | null,
        lastName: string | null,
        createdAt: Date | string,
        updatedAt: Date|string
    }[],
    timestamp: number,
    invalidAt: number

} = {
    users: [],
    timestamp: 0,
    invalidAt: 0,
}
export async function fetchUsersCache() {
    if (global.debugMode) console.log("[AUTH] Fetching users...")
    cached.users = await getUsers()
    cached.timestamp = Date.now()
    cached.invalidAt = Date.now() + cacheValidity
    return cached.users.length
}

export async function clearCache() {
    cached.invalidAt = Date.now()
}

export async function generateAPIToken(id: string) {
    const APIKeyDetails = global.APIKeyTable[id]
    if (!APIKeyDetails) {
        return null
    }
    const strippedBaseURL = process.env.BASE_URL.replace(/(^\w+:|^)\/\//, '')
    return await new SignJWT({
        id
    })
    .setAudience(strippedBaseURL)
    .setIssuer(strippedBaseURL)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(new Uint8Array(Buffer.from(APIKeyDetails.key)))
}

export async function verifyAPIToken(token: string): Promise<APIKey|null>{
    token = token.replace("Bearer ", "")
    const contentPart = token.split(".")[1]
    const decoded = Buffer.from(contentPart, "base64").toString()
    const payload = JSON.parse(decoded)
    const APIKeyDetails = global.APIKeyTable[payload?.id]
    if (!APIKeyDetails) return null
    return await jwtVerify(token, new Uint8Array(Buffer.from(APIKeyDetails.key)), {
        audience: strippedBaseURL,
        issuer: strippedBaseURL,
        algorithms: ["HS256"],
        requiredClaims: ["iat", "iss", "aud"],
    }).then(() => {
        return {id:payload?.id,...APIKeyDetails}
    }).catch(() => {
        return null
    })
}

export async function doesUserExist(id: string): Promise<boolean> {
    if (global.debugMode) console.log("[AUTH] Checking if user exists: " + id + (cached.invalidAt <= cached.timestamp ? "" : " ("+(cached.users.find((user) => user.id === id).email??"N/A")+")"))
    if (cached.invalidAt <= cached.timestamp) {
        if (cached.invalidAt != 0) {
            if (global.debugMode)  console.log("[AUTH] Cache is invalid. Fetching users.")
        } else {
            if (global.debugMode)  console.log("[AUTH] Fetching users...")
        }
        await fetchUsersCache().then((amountOfUsers)=>{
            if (global.debugMode) console.log("[AUTH] Cached " + amountOfUsers + " users.")
        })
    }
    const res = cached.users.find((user) => user.id === id)
    return !!res
}