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

import Image from 'next/image';

const API_URL = (process.env.API_URL)

export default async function Home() {
    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    const user = await getUser("Bearer " + cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

    const createSubmit = submit.bind(null, "create", {})
    
    async function logout() {
        "use server";
        cookies().delete("token")
        redirect("/login")
    }

    async function goToHome() {
        "use server";
        redirect("/")
    }

    return (
        <div className="create main-container" style={{
            backgroundImage: "url('/res/img/newseed_background.png')",
            backgroundRepeat: "no-repeat",
            overflowX: "hidden",
        }}>
            <header style={{padding:"calc(1.5em + 8px)", display:"flex", justifyContent: "space-between"}} className="header">
                    <form action={goToHome}>
                        <button type="submit">
                            <Image src="/res/img/logo.png" priority={true} width={450} height={99} style={{
                                maxHeight: "99px"
                            }} alt="QRLink logo"/>
                        </button>
                    </form>
                <div className='header topright' style={{
                    display: "flex",
                    gap: "10px",
                    height:"min-content",
                    width: "min-content",
                    alignItems: "center"
                }}>
                    <div id="buttons" className="w-max header buttons h-[60px]">

                        <form action={logout} className="w-[200px] h-min" id="logOut">
                            <button type="submit" id="logOutButton" className="w-[100%] header main-button">
                                Logout <Image src="/res/img/signout.png" width={40} height={39} alt="Logout" style={{paddingLeft:10}}/>
                            </button>
                        </form>                        
                    </div>
                </div>
            </header>

            <div id="create-new" style={{
            position:"relative",
            top: -80
          }}>
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
            <footer className="copyright-footer create">
                <p>
                    &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
                </p>
            </footer>
        </div>
    );
}


