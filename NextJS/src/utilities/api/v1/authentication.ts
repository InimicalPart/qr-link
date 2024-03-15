import { SignJWT, jwtVerify } from "jose";
import WorkOS from "@workos-inc/node";
import { QRLinkGlobal } from "@/types/api/v1/global";
const secret = new Uint8Array(Buffer.from(process.env.JWT_SECRET, "base64"));
const workos = new WorkOS(process.env.WORKOS_API_KEY);
export var cacheValidity = 5 * 60 * 1000 //! 5 minutes - We export this value so that the user can change it if they want to



/**
 * Resolves a user's ID to their information.
 * @param id The ID of the user to resolve.
 * @returns A promise that resolves to the user's information.
 */
export async function resolveID(id: string): Promise<User> {
    console.log("[AUTH] Resolving ID: " + id)
    const res = await workos.userManagement.getUser(id) // This doesn't need to be cached, as it might happen that the user is not in the cache at the time of the request, and this could break things
    console.log("[AUTH] ID resolved: " + res.email)
    return res
}

declare const global: QRLinkGlobal
const strippedBaseURL = process.env.BASE_URL.replace(/(^\w+:|^)\/\//, '');


/**
 * Checks if the provided token is an API key.
 * @param token The token to check.
 * @returns A boolean indicating whether the token is an API key.
 */
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



/**
 * Gets the API key ID from the provided API token.
 * @param token The API token to get the ID from.
 * @returns The ID of the API key.
 */
export async function getIDFromAPIToken(token: string) {
    const verifiedToken = await verifyAPIToken(token)
    if (!verifiedToken) return null
    return verifiedToken.id
}

/**
 * Updates a user's information in the WorkOS database.
 * @param id The ID of the user to update.
 * @param data The data to update the user with.
 * @param data.email The new email of the user.
 * @param data.firstName The new first name of the user.
 * @param data.lastName The new last name of the user.
 * @returns 
 */
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


    return {token:newToken, user}
}
/**
 * Authenticates a user based on the provided token.
 * @param token The token to authenticate.
 * @param options Additional options for authentication.
 * @param options.allowAPIKey Whether to allow API keys for authentication. Defaults to true.
 * @param options.required_permission A permission or an array of permissions that the API token must have. If the token does not have the required permission, the authentication will fail.
 * @param options.verify A function that takes the result of the authentication and returns a boolean. If the function returns false, the authentication will fail.
 * @param options.updateLastUsed Whether to update the last_used date of the API key. Defaults to true.
 * @returns A promise that resolves to an authentication result.
 */
export async function getUser(token: string,options:{
    
    allowAPIKey?:boolean,
    required_permission?:APIKeyPermissions|APIKeyPermissions[],
    verify?:(res: UserVerify | APIVerify) => boolean,
    updateLastUsed?:boolean
} = {}): Promise<{isAuthenticated: boolean, reason?: string, user?: {
    profilePictureUrl: string;object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string 
}}> {
    
    //! Set default options
    options = {
        allowAPIKey: true,
        updateLastUsed: true,
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

        if (options.updateLastUsed) {
            console.log("[AUTH] Updating last used date for API token: " + token.substring(0, 10) + "..." + token.substring(token.length - 10, token.length))
            global.APIKeyTable[verifiedToken.id].last_used = new Date().toISOString()
        }

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


/**
 * Gets a list of all users in the WorkOS database.
 * @returns A promise that resolves to a list of all users in the WorkOS database.
 */
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

/**
 * Fetches the users from the WorkOS database and caches them.
 * @returns A promise that resolves to the amount of users fetched.
 */
export async function fetchUsersCache() {
    if (global.debugMode) console.log("[AUTH] Fetching users...")
    cached.users = await getUsers()
    cached.timestamp = Date.now()
    cached.invalidAt = Date.now() + cacheValidity
    return cached.users.length
}

/**
 * Clears the user cache.
 */
export async function clearCache() {
    cached.invalidAt = Date.now()
}

/**
 * Generates an API token for the provided API key ID.
 * @param id The ID of the API key to generate the token for.
 * @returns The generated API token.
 */
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

/**
 * Verifies an API token.
 * @param token The API token to verify.
 * @returns The verified API key details.
 */
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

/**
 * Checks if a user exists in the WorkOS database.
 * @param id The ID of the user to check for.
 * @returns A promise that resolves to a boolean indicating whether the user exists.
 */
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