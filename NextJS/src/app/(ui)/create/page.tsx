// "use server"

import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Create a QRLink-code'
}

import "./create.css"
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { submit } from "@/utilities/(ui)/create/submit.server";

import Form from "@/components/create/form.client";
import React from 'react'
import QRCodeImage from "@/components/create/qrCodeImage.client";


const API_URL = (process.env.API_URL ?? "http://localhost:8080/api/v1")
const secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
    );
const strippedBaseURL = process.env.BASE_URL.replace(/(^\w+:|^)\/\//, '');

export default async function Home() {
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

    const createSubmit = submit.bind(null, "create", {})
    
    return (
      <div>
        <div id="create-new">
            <div style={{
                width: 250,
                height: 250,
                left: '50%',
                marginTop: 50,
                position: 'relative',
                transform: 'translateX(-50%)'
            }}>
                {/* <div id="qr-code" className="select-none"></div> */}
                <QRCodeImage API_URL={API_URL}/>

            </div>
            <div id="qr-info" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                position: 'relative',
                top: 20
            }} className="select-none">
            <Form submit={createSubmit}/>
            </div>
        </div>
    </div>);
}


