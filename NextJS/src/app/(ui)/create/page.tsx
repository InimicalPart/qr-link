// "use server"

import Script from "next/script";
import "./create.css"
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { z } from 'zod'
import { submit } from "@/utilities/(ui)/create/submit.server";

const API_URL = (process.env.API_URL ?? "http://localhost:8080/api/v1")
let secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
    );
// import CreateQR from "@/components/create/createqr.client";
import Form from "@/components/create/form.client";
import React, { useState } from 'react'
import Head from "next/head";
import Alerts from "@/components/all/alerts.client";
import QRCodeImage from "@/components/create/qrCodeImage.client";

export default async function Home() {
    if (cookies()?.get("token")?.value) {
        let valid = false
        await jwtVerify(cookies().get("token").value, secret).then(()=>{
            valid = true
        }).catch(()=>{
            valid = false
        })
        if (!valid) redirect("/login")
    } else {
        redirect("/login")
    }
    console.log("valid")

    const createSubmit = submit.bind(null, "create", {})
    
    return (
      <div>
        <Alerts/>
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


