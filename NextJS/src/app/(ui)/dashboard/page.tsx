
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
import { AddQR } from '@/components/index/addQR.client';
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



    async function scanQR() {
        "use server";
        redirect("/dashboard?scan=true")
    }

    // async function linkQR() {
    //     "use server";
    // }

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
            <Image src="/res/img/logo.png" priority={true} width={450} height={99} alt="QRLink logo"/>


            <div className='topright' style={{
                display: "flex",
                gap: "10px",
                height:"min-content",
                width: "min-content",
                alignItems: "center"
            }}>
                <div className="max-w-md w-[275px] h-[60px] dashboard search">   
                    <label htmlFor="default-search" className="mb-2 text-sm font-medium text-gray-900 sr-only">Search</label>
                    <div className="relative" style={{height:"inherit"}}>
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                            </svg>
                        </div>
                        <input type="search" id="qr-search" className="h-[60px] block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-500 rounded-2xl focus:outline-none" placeholder="Search for QRLink-codes" />
                    </div>
                </div>


                <div id="buttons" className="w-max dashboard buttons h-[60px]">

                    <form action={scanQR} className="w-[200px] h-min" id="scanQR">
                        <button type="submit" id="scanQRButton" className="w-[100%] dashboard main-button">
                            Find QR <Image src={"/res/img/camera.png"} width={40} height={40} alt="Find QR" style={{paddingLeft:10}}/>
                        </button>
                    </form>
                    <form action={logout} className="w-[200px] h-min" id="logOut">
                        <button type="submit" id="logOutButton" className="w-[100%] dashboard main-button">
                            Logout <Image src="/res/img/signout.png" width={40} height={39} alt="Logout" style={{paddingLeft:10}}/>
                        </button>
                    </form>                        
                </div>


                </div>
            </header>
    <div id="qr-container" className="left-[50%] w-[calc(302px*1)] md:w-[calc(302px*2)] lg:w-[calc(302px*3)] xl:w-[calc(302px*4)] 2xl:w-[calc(302px*5)] relative" style={{
        transform: "translateX(-50%)",
        display: "flex",
        flexWrap: "wrap",
        paddingBottom: "20px",
    }}>
        <AddQR className="mobile-only DO-flex"/>
        <GenerateQRs handleClick={manageQR} token={cookies().get("token").value} apiURL={API_URL}/>
        <AddQR className="desktop-only DO-flex"/>
    </div>



    <footer className="copyright-footer dashboard">
        <p>
            &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
        </p>
    </footer>
  </div>
  );
}
