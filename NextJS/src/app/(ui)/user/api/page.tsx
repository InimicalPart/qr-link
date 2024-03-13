import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

const strippedBaseURL = process.env.BASE_URL.replace(/(^\w+:|^)\/\//, '');
const secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
    );

export default async function UserAPI() {

    //TODO: REMOVE
    if (process.env.NODE_ENV === "production") {
        return notFound()
    }

    if (cookies()?.get("token")?.value) {
        let valid = await jwtVerify(cookies().get("token").value, secret, {
            audience: strippedBaseURL,
            issuer: strippedBaseURL,
            algorithms: ["HS256"],
            requiredClaims: ["exp", "iat", "iss", "aud"],
        }).then(()=>true).catch(()=>false)
        if (!valid) redirect("/login")
    } else {
        redirect("/login")
    }

    return (
        <div>
            <h1>User API Settings</h1>
            <p>This page is a work in progress.</p>
        </div>
    );
}