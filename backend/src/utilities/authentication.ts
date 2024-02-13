import { jwtVerify } from "jose";
import WorkOS from "@workos-inc/node";
const secret = new Uint8Array(Buffer.from(process.env.JWT_SECRET, "base64"));
const workos = new WorkOS(process.env.WORKOS_API_KEY);

export async function resolveID(id: string): Promise<{object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string }> {
    console.log("[JWT] Resolving ID: " + id)
    const res = await workos.userManagement.getUser(id)
    console.log("[JWT] ID resolved: " + res.email)
    return res
}

export async function getUser(token): Promise<{isAuthenticated: boolean, user?: {object:string, id:string, email: string, emailVerified: boolean, firstName: string | null, lastName: string | null, createdAt: Date | string, updatedAt: Date|string }}> {
    console.log("[JWT] Verifying token: " + token.substring(0, 10) + "..." + token.substring(token.length - 10, token.length))
    let verifiedToken;
    try {
      verifiedToken = await jwtVerify(token, secret);
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