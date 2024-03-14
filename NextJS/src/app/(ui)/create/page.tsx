// "use server"

import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Create a QRLink-code'
}

import "./create.css"
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { submit } from "@/utilities/(ui)/create/submit.server";

import Form from "@/components/create/form.client";
import React from 'react'
import QRCodeImage from "@/components/create/qrCodeImage.client";
import { getUser } from '@/utilities/api/v1/authentication';

const API_URL = (process.env.API_URL)

export default async function Home() {
    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    const user = await getUser(cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

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


