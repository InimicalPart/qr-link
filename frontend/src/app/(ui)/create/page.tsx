// "use server"

import Script from "next/script";
import "./create.css"
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";

const API_URL = (process.env.API_URL ?? "http://localhost:3000")
let secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
    );
import CreateQR from "@/components/create/createqr.client";
import Actions from "@/components/create/actions.client";
import React, { useState } from 'react'
import Head from "next/head";
import Alerts from "@/components/all/alerts.client";

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

    
    return (
      <div>
        <Alerts/>
        <span id="apiurl" style={{ display: "none" }}>{process.env.API_URL ?? "http://localhost:3000"}</span>
        <div id="create-new">
            <div style={{
                width: 200,
                height: 200,
                left: '50%',
                marginTop: 50,
                position: 'relative',
                transform: 'translateX(-50%)'
            }}>
                <div id="qr-code" className="select-none"></div>
            </div>
            <div id="qr-info" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                position: 'relative',
                top: 50
            }} className="select-none">
                <div id="qr-id-cntr" className="QRL-container">
                    <p className="qr-info-label flex justify-center items-center flex-wrap"><b>ID</b> <span style={{
                        fontSize: '8pt',
                        flexBasis: '100%',
                        marginTop: -5
                    }}>(optional)</span></p>
                    <input id="qr-id" style={{
                        width: 300,
                        border: '1px black solid',
                        borderRadius: 8,
                        textAlign: 'center'
                    }} autoCapitalize="false" spellCheck="false" type="text" placeholder="Leave blank for random" maxLength={50}/>
                </div>
                <div id="qr-updatekey-cntr" className="QRL-container">
                    <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Update Key</b> <span style={{
                        fontSize: '8pt',
                        flexBasis: '100%',
                        marginTop: -5
                    }}>(optional)</span></p>
                    <input id="qr-updatekey" style={{
                        width: 300,
                        border: '1px black solid',
                        borderRadius: 8,
                        textAlign: 'center'
                    }} autoCapitalize="false" spellCheck="false" type="password" placeholder="Leave blank for random" maxLength={100}/>
                </div>
                <div id="qr-name-cntr" className="QRL-container">
                    <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Name</b><span style={{
                        fontSize: '8pt',
                        flexBasis: '100%',
                        marginTop: -5
                    }}>(optional)</span></p>
                    <input id="qr-name" style={{
                        width: 300,
                        border: '1px black solid',
                        borderRadius: 8,
                        textAlign: 'center'
                    }} type="text" maxLength={50}/>
                </div>
                <div id="qr-description-cntr" className="QRL-container">
                    <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Description</b><span style={{
                        fontSize: '8pt',
                        flexBasis: '100%',
                        marginTop: -5
                    }}>(optional)</span></p>
                    <textarea id="qr-description" style={{
                        width: 300,
                        border: '1px black solid',
                        borderRadius: 8,
                        textAlign: 'center',
                        height: 150,
                        maxHeight: 400
                    }} maxLength={200}></textarea>
                </div>
                <div id="qr-expires-cntr" className="QRL-container">
                    <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Expires</b></p>
                    <input id="qr-expires" className="disabled:bg-neutral-400" style={{
                        border: '1px black solid',
                        borderRadius: 8,
                        textAlign: 'center'
                    }} disabled type="datetime-local"/>
                    <input style={{
                        marginLeft: 10
                    }} id="qr-never-expires-checkbox" type="checkbox" defaultChecked/>
                    <label style={{marginLeft:5}} htmlFor="qr-never-expires-checkbox">Never</label>
                </div>
                {/* TODO Make it so you can choose what you want instead of only redirect */}
                
                <Actions token={cookies().get("token").value} apiURL={API_URL}/>

                <CreateQR token={cookies().get("token").value} apiURL={API_URL}/>        

            </div>
        </div>
    </div>);
}