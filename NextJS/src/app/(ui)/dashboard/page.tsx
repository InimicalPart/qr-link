
import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'QRLink Dashboard',
}

import Image from 'next/image'
import "./index.css";
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
const secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
);

import GenerateQRs from '@/components/index/generate.client';
import { Modal } from '@/components/all/modal';
import QRScannerModal from './@scanner/page';
const API_URL = process.env.API_URL ?? "http://localhost:8080/api/v1"
type SearchParamProps = {
    searchParams: Record<string, string> | null | undefined
}

export default async function Home({
    searchParams
}:SearchParamProps) {
    let show = searchParams.scan === "true"
    async function logout() {
        "use server";
        cookies().delete("token")
        redirect("/login")
    }

    async function manageQR(form: FormData) {
        "use server";
        const id = form.get("id")
        if (id) {
            redirect(`/manage/${id}`)
        }
    }

    async function addQR() {
        "use server";
        redirect("/create")
    }

    async function scanQR() {
        "use server";
        redirect("/dashboard?scan=true")
    }

    async function linkQR() {
        "use server";
    }

    async function scanResult(RES:string) {
        "use server";
        try {
            const ID = (RES.match(API_URL + "/qrcode/(.{1,50})/handler"))[1]
            // id is valid
            const res = await fetch(`${API_URL}/qrcode/${ID}`, {
                headers: {
                    Authorization: cookies().get("token").value
                }
            }).then((res) => res.json())

            if (res.error) {
                return {
                    valid: false,
                    message: res.error == "INVALID_ID" ? "The scanned QRLink code has a non-existant ID. Please try again..." : "Your session has expired. Please log in again."
                }
            } else {
                // if we can see the update key (meaning we have the authorization to manage)
                if (res.update_key) {
                    return {
                        valid: true,
                        redirect_to: `/manage/${ID}`
                    }
                } else {
                    return {
                        valid: false,
                        message: "You do not have the authorization to manage this QR code."
                    }
                }
            }

        } catch(e) {
            return {
                valid: false,
                message: "The scanned code is not a valid QRLink code. Please try again..."
            }
        }
        
    }


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
    return (
      <div className="dashboard main-container" style={{
        backgroundImage: "url('/res/img/newseed_background.png')",
        backgroundRepeat: "no-repeat",
        overflowX: "hidden",
    }}>
        {show &&
            <Modal backURL='/dashboard'>
                <QRScannerModal callback={scanResult} API_URL={API_URL}/>
            </Modal>
        }
        <header style={{padding:"calc(1.5em + 8px)", display:"flex", justifyContent: "space-between"}} className="dashboard">
            <Image src="/res/img/logo.png" width={450} height={99} alt="QRLink logo"/>
            <div id="buttons" className="w-[408px] dashboard buttons">

            <form action={scanQR} className="w-[200px]" id="scanQR">
                <button type="submit" id="scanQRButton" className="w-[100%] dashboard main-button" style={{
                }}>Find QR <Image src={"/res/img/camera.png"} width={40} height={30} alt="Find QR" style={{paddingLeft:10}}/></button>
                </form>
                <form action={logout} className="w-[200px]" id="logOut">
                    <button type="submit" id="logOutButton" className="w-[100%] dashboard main-button" style={{
                    }}>Logout <Image src="/res/img/signout.png" width={40} height={29} alt="Logout" style={{paddingLeft:10}}/>
                    </button>
                    </form>
                
                </div>


            </header>
    <div id="qr-container" className="left-[50%] w-[calc(302px*1)] md:w-[calc(302px*2)] lg:w-[calc(302px*3)] xl:w-[calc(302px*4)] 2xl:w-[calc(302px*5)] relative" style={{
        transform: "translateX(-50%)",
        display: "flex",
        flexWrap: "wrap",
        paddingBottom: "20px",
    }}>

        <GenerateQRs handleClick={manageQR} token={cookies().get("token").value} apiURL={API_URL}/>

        <form action={addQR} className="qr select-none cursor-pointer md:min-h-[633px]" id="add-qr-form" style={{
            width: "302px",
            height: "auto",
            // border: "1px black solid",
            borderRadius:3,
            justifyContent: "center",
            flexDirection: "column",
            display:'flex',
            pointerEvents: "none",
        }}>
            <button id="add-qr" style={{
                pointerEvents: "auto",
                width:"100%",
                height:"100%",
                display:"flex",
                justifyContent:"center",
                alignItems:"center",
            }}> 
                <Image src={"/res/img/add_text.png"} width={179} height={179} alt="Add QR" style={{
                    transform: "scale(0.8)",
                    margin: "30px 0px"
                }}/>
            </button>
        </form>
    </div>



    <footer className="copyright-footer">
        <p>
            &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
        </p>
    </footer>
  </div>
  );
}
