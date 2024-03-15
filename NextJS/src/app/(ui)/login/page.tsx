
import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Login to QRLink',
}


import Image from "next/image";
import Script from "next/script";
import "./login.css"

import { WorkOS } from '@workos-inc/node';
import { redirect } from "next/navigation";
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose';
import GetURL from "@/components/all/getURL.client";
import Background from "@/components/login/background.client";
import { getUser } from '@/utilities/api/v1/authentication';
const secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
    );

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const WORKOS_CLIENT_ID=process.env.WORKOS_CLIENT_ID
let thisURL = process.env.BASE_URL ?? "http://localhost:8080"

const strippedBaseURL = process.env.BASE_URL.replace(/(^\w+:|^)\/\//, '');

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

    //! Make sure the user is logged in
    if (cookies()?.get("token")?.value) {
        let user = await getUser(cookies().get("token").value, { allowAPIKey:false })
        if (user.isAuthenticated) redirect("/dashboard")
    }
    


    return (
      <>
      <div style={{backgroundColor: "black", zIndex:-50, width:"100svw", height:"100svh"}}></div>
      <Background/>
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
                width={279}
                height={129}
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
                className="login button"
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
        <footer className="copyright-footer login">
        <p>
            &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
        </p>
    </footer>
        <Script src="/res/js/login.js"/>
      </>
    );
}