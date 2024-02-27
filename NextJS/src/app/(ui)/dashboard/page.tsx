import Image from 'next/image'
import Script from 'next/script';
import "./index.css";
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
const secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
);

import GenerateQRs from '@/components/index/generate.client';
const API_URL = process.env.API_URL ?? "http://localhost:8080/api/v1"
export default async function Home() {
    console.log(API_URL)
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
      <div>
        {/* <span id="apiurl" style={{ display: "none" }}>{process.env.API_URL ?? "http://localhost:8080/api/v1"}</span> */}
        <form action={logout} id="logOut">
            <button type="submit" id="logOutButton" className="w-[calc(302px*1)] sm:w-[calc(302px*2)] md:w-[calc(302px*3)] lg:w-[calc(302px*4)] xl:w-[calc(302px*5)]" style={{
                position: "relative",
                left: "50%",
                top: "20px",
                marginBottom: "20px",
                padding: "0.75vh 0px",
                color: "white",
                background: "linear-gradient(45deg, #6161ff,cyan)",
                fontWeight: "900",
                transform: "translateX(-50%)",
                borderRadius: "12px",
                border: "2px solid black",        
            }}>Log out</button>
    </form>
    <div id="qr-container" className="left-[50%] w-[calc(302px*1)] sm:w-[calc(302px*2)] md:w-[calc(302px*3)] lg:w-[calc(302px*4)] xl:w-[calc(302px*5)]" style={{
        transform: "translateX(-50%)",
        display: "flex",
        flexWrap: "wrap",
        position: "absolute",
        marginTop: "20px",
        paddingBottom: "20px",
    }}>

        <GenerateQRs handleClick={manageQR} token={cookies().get("token").value} apiURL={API_URL}/>

        <form action={addQR} className="qr select-none cursor-pointer md:min-h-[633px]" id="add-qr-form" style={{
                background: "linear-gradient(114deg, #0000ffc7,#00dcffc7)",
                width: "302px",
                height: "auto",
                border: "1px black solid",
                justifyContent: "center",
                flexDirection: "column",
                paddingBottom: "10px",
                display:'flex',
                pointerEvents: "none"
                }}>
            <button id="add-qr" style={{
                pointerEvents: "auto",
                width:"100%",
                height:"100%",
            }}> 
                <h1 style={{
                    fontSize: "55pt",
                    color: "white",
                    position: "relative",
                    // top: "50%",
                    left: "50%",
                    textAlign: "center",
                    transform: "translateX(-50%)",
                }}>+</h1>
            </button>
        </form>
    </div>
  </div>
  );
}
