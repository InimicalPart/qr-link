import Image from "next/image";
import Script from "next/script";
import "./login.css"

import { WorkOS } from '@workos-inc/node';
import { redirect } from "next/navigation";
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose';
import GetURL from "@/components/all/getURL.client";
const secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
    );

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const WORKOS_CLIENT_ID=process.env.WORKOS_CLIENT_ID
let thisURL = process.env.UI_URL ?? "http://localhost:8080"
export default async function Home() {


    async function login() {
        "use server";
         function getAuthorizationUrl() {

            console.log("Getting authorization URL for " + thisURL)
            const authorizationUrl = workos.userManagement.getAuthorizationUrl({
              // Specify that we'd like AuthKit to handle the authentication flow
              provider: 'authkit',
          
              // The callback endpoint that WorkOS will redirect to after a user authenticates
              redirectUri: thisURL+'/api/authkit/callback',
              clientId: WORKOS_CLIENT_ID
            });
          
            return authorizationUrl;
          }
        redirect(getAuthorizationUrl())
    }
    async function setURL(form:FormData) {
        "use server"
        console.log("Setting URL to " + form.get("url"))
        thisURL = (form.get("url") as string).replace("/login", "")
    }

    if (cookies()?.get("token")?.value) {
        let valid = false
        await jwtVerify(cookies().get("token").value, secret).then(()=>{
            valid = true
        }).catch(()=>{})
        console.log(valid)
        if (valid) redirect("/dashboard")
    }
    


    return (
      <div>
        <div id="loginBGCover" style={{zIndex: 50 }}>
          <div
            id="loginPage"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
            }}>
            <Image
              src="/res/img/newseed.png"
              alt="NewSeed Logo"
                width={300}
                height={300}
              style={{
                maxWidth: "70%",
                position: "absolute",
                left: "50%",
                top: 30,
                transform: "translateX(-50%)",
              }}/>
            <div
              id="actions"
              style={{
                width: "100%",
                position: "absolute",
                bottom: 20,
              }}>
                <form action={login} id="loginForm">
              <button
                className="button"
                style={{
                    marginBottom: 5,
                    flexBasis: "100%",
                    height: 70
                }}
                type="submit"
                id="loginBtn">
                Sign In / Sign Up
              </button>
                    </form>
            </div>
          </div>
        </div>
        <GetURL setURL={setURL}/>
        <Script src="/res/js/login.js"/>
      </div>
    );
}