
import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'QRLink Dashboard',
}

import Image from 'next/image'
import "./index.css";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import GenerateQRs from '@/components/index/generate.client';
import { Modal } from '@/components/all/modal';
import QRScannerModal from './@scanner/page';
import { AddQR } from '@/components/index/addQR.client';
import { getUser } from '@/utilities/api/v1/authentication';
const API_URL = process.env.API_URL
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
                // if we can see the update settings (meaning we have the authorization to manage) we redirect to the manage page
                if (res.settings) {
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

    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    const user = await getUser(cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

    async function goToHome() {
        "use server";
        redirect("/")
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
            <form action={goToHome}>
                <button type="submit">
                    <Image src="/res/img/logo.png" priority={true} width={450} height={99} style={{
                        maxHeight: "99px"
                    }} alt="QRLink logo"/>
                </button>
            </form>



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
    <div id="qr-container" className="left-[50%] w-[calc(301px*1)] md:w-[calc(301px*2)] lg:w-[calc(301px*3)] xl:w-[calc(301px*4)] 2xl:w-[calc(301px*5)] relative" style={{
        transform: "translateX(-50%)",
        display: "flex",
        flexWrap: "wrap",
        paddingBottom: "20px",
    }}>
        <AddQR className="mobile-only DO-flex"/>
        <GenerateQRs handleClick={manageQR} token={cookies().get("token").value} apiURL={API_URL}/>
        <AddQR className="desktop-only DO-flex"/>
    </div>
    
    {/* <form action={goToProfile}>
        <button type="submit" style={{
            position:"fixed",
            bottom: 10,
            left: 10,
            height:"min-content",
            width: "fit-content",
            alignItems: "center",
            borderRadius: "15px"
        }}>
                <ProfilePicture src={user.user.profilePictureUrl}/>
        </button>

    </form> */}


    <footer className="copyright-footer dashboard">
        <p>
            <a className="user-profile" href="/user/profile">User profile for {user.user.firstName}</a>
        </p>
        <p>
            &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
        </p>
    </footer>
  </div>
  );
}
