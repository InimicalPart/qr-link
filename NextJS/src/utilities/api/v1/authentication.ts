import { jwtVerify } from "jose";
import WorkOS from "@workos-inc/node";
const secret = new Uint8Array(Buffer.from(process.env.JWT_SECRET, "base64"));
const workos = new WorkOS(process.env.WORKOS_API_KEY);
export const cacheValidity = 5 * 60 * 1000 //! 5 minutes
export async function resolveID(id: string): Promise<{object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string }> {
    console.log("[AUTH] Resolving ID: " + id)
    const res = await workos.userManagement.getUser(id) // This doesn't need to be cached, as it might happen that the user is not in the cache at the time of the request, and this could break things
    console.log("[AUTH] ID resolved: " + res.email)
    return res
}

export async function getUser(token: string): Promise<{isAuthenticated: boolean, user?: {object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string }}> {
    console.log("[AUTH] Verifying token: " + token.substring(0, 10) + "..." + token.substring(token.length - 10, token.length))
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
      console.log("[AUTH] Token is invalid.")
      return { isAuthenticated: false };
    }
  
    console.log("[AUTH] Token is valid. User: " + verifiedToken.payload.user.email)
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
    console.log("[AUTH] Fetching users...")
    cached.users = await getUsers()
    cached.timestamp = Date.now()
    cached.invalidAt = Date.now() + cacheValidity
    return cached.users.length
}

export async function clearCache() {
    cached.invalidAt = Date.now()
}
export async function doesUserExist(id: string): Promise<boolean> {
    console.log("[AUTH] Checking if user exists: " + id + (cached.invalidAt <= cached.timestamp ? "" : " ("+(cached.users.find((user) => user.id === id).email??"N/A")+")"))
    if (cached.invalidAt <= cached.timestamp) {
        if (cached.invalidAt != 0) {
            console.log("[AUTH] Cache is invalid. Fetching users.")
        } else {
            console.log("[AUTH] Fetching users...")
        }
        await fetchUsersCache().then((amountOfUsers)=>{
            console.log("[AUTH] Cached " + amountOfUsers + " users.")
        })
    }
    const res = cached.users.find((user) => user.id === id)
    return !!res
}