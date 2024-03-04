import { jwtVerify } from "jose";
import WorkOS from "@workos-inc/node";
const secret = new Uint8Array(Buffer.from(process.env.JWT_SECRET, "base64"));
const workos = new WorkOS(process.env.WORKOS_API_KEY);
export const cacheValidity = 5 * 60 * 1000 //! 5 minutes
export async function resolveID(id: string): Promise<{object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string }> {
    console.log("[JWT] Resolving ID: " + id)
    const res = await workos.userManagement.getUser(id) // This doesn't need to be cached, as it might happen that the user is not in the cache at the time of the request, and this could break things
    console.log("[JWT] ID resolved: " + res.email)
    return res
}

export async function getUser(token: string): Promise<{isAuthenticated: boolean, user?: {object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string }}> {
    console.log("[JWT] Verifying token: " + token.substring(0, 10) + "..." + token.substring(token.length - 10, token.length))
    let verifiedToken;
    try {
      verifiedToken = await jwtVerify(token, secret) as {
        payload: {
          user: {
            object: string,
            id: string,
            email: string,
            emailVerified: boolean,
            firstName: string | null,
            lastName: string | null,
            createdAt: Date | string,
            updatedAt: Date | string
          }
        }
      }
    } catch {
      console.log("[JWT] Token is invalid.")
      return { isAuthenticated: false };
    }
  
    console.log("[JWT] Token is valid. User: " + verifiedToken.payload.user.email)
    return {
      isAuthenticated: true,
      user: verifiedToken.payload.user,
    };
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
    console.log("[JWT] Fetching users...")
    cached.users = await getUsers()
    cached.timestamp = Date.now()
    cached.invalidAt = Date.now() + cacheValidity
    return cached.users.length
}

export async function clearCache() {
    cached.invalidAt = Date.now()
}
export async function doesUserExist(id: string): Promise<boolean> {
    console.log("[JWT] Checking if user exists: " + id)
    if (cached.invalidAt <= cached.timestamp) {
        if (cached.invalidAt != 0) {
            console.log("[JWT] Cache is invalid. Fetching users.")
        } else {
            console.log("[JWT] Fetching users...")
        }
        cached.users = await getUsers()
        cached.timestamp = Date.now()
        cached.invalidAt = Date.now() + cacheValidity
    }
    const res = cached.users.find((user) => user.id === id)
    return !!res
}