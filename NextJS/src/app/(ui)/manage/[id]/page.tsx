// "use server"

export async function generateMetadata(
    { params}: {
        params: { id: string }
    },
    parent: ResolvingMetadata
  ): Promise<Metadata> {
    // read route params
    const id = params.id

    return {
      title: "Manage QRLink with ID " + id,
    }
  }

import Script from "next/script";
import "./manage.css"
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
import QRCodeImage from "@/components/create/qrCodeImage.client";
import PDFButton from "@/components/manage/generatePDF.client";
import ExportButtons from "@/components/all/exportButtons.client";
import { Metadata, ResolvingMetadata } from "next";

export default async function Update({
    params
}: {params:{id:string}}) {
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

    const qrCodeDetails = await fetch(`${API_URL}/qrcode/${params.id}?export=png,svg`, {
        headers: {
            Accept: "application/json",
            Authorization: `${cookies().get("token").value}`
        },
    }).then((res) => res.json())

    async function delQR() {
        "use server";

        const id = params.id
        if (id) {
            await fetch(`${API_URL}/qrcode/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: cookies().get("token").value
                }
            }).then((res) => {
                if (res.status === 200) {
                    redirect("/dashboard")
                } else {
                    console.error(res)
                }

            })
        }

    }


    const updateSubmit = submit.bind(null, "update", qrCodeDetails)
    
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
                  <QRCodeImage qrCodeDetails={qrCodeDetails} API_URL={API_URL}/>
              </div>
              <div style={{
                    width: 250,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    position: 'relative',
                }}>
                <hr style={{
                            width: 250,
                            position: 'relative',
                            height: 2,
                            background: 'black',
                            borderRadius: 5
                    }}/>
                    <ExportButtons qrCodeDetails={qrCodeDetails} token={cookies().get("token").value} className={"manage button"}/>
                    <hr style={{
                            width: 250,
                            position: 'relative',
                            height: 2,
                            background: 'black',
                            marginTop: 30,
                            borderRadius: 5
                    }}/>

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
              <Form submit={updateSubmit} qrCodeInfo={qrCodeDetails} delQR={delQR}/>
              </div>
          </div>
      </div>);
}


