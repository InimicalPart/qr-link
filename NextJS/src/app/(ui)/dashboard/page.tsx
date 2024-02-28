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

    async function scanQR() {
        "use server";
    }

    async function linkQR() {
        "use server";
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
        <div id="buttons" className="w-[calc(302px*1)] sm:w-[calc(302px*2)] md:w-[calc(302px*3)] lg:w-[calc(302px*4)] xl:w-[calc(302px*5)]" style={{
                position: "relative",
                left: "50%",
                top: "20px",
                transform: "translateX(-50%)",
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: "20px",
                
        }}>

        <form action={logout} className="w-[calc(302px*1)] sm:w-[calc(302px*2)] md:w-[calc(302px*3)] lg:w-[calc(302px*4)] xl:w-[calc(302px*5)]" id="logOut">
            <button type="submit" id="logOutButton" className="w-[100%] dashboard main-button" style={{

                padding: "0.75vh 0px",
                color: "white",
                background: "linear-gradient(45deg, rgb(165 31 31), #1800ff, rgb(165 31 31))",
                fontWeight: "900",
                borderRadius: "12px",
                border: "2px solid black",
                marginBottom: 5,
                lineHeight: 1.5  
            }}>Log out</button>
            </form>
        <form action={scanQR} className="w-[calc(151px*1)] sm:w-[calc(151px*2)] md:w-[calc(151px*3)] lg:w-[calc(151px*4)] xl:w-[calc(151px*5)]" id="scanQR">
            <button type="submit" id="scanQRButton" className="w-[calc(100%-1px)] dashboard main-button" style={{
                padding: "0.75vh 0px",
                color: "white",
                background: "linear-gradient(45deg, rgb(165 31 31), #1800ff)",
                fontWeight: "900",
                borderRadius: "12px",
                marginRight: 1,
                border: "2px solid black",        
            }}>Scan QR <br className="mobile-only"/><span style={{fontSize:10, verticalAlign:"middle"}}>(not implemented yet)</span></button>
            </form>
            <form action={linkQR} className="w-[calc(151px*1)] sm:w-[calc(151px*2)] md:w-[calc(151px*3)] lg:w-[calc(151px*4)] xl:w-[calc(151px*5)]" id="linkQR">
            <button type="submit" id="linkQRButton" className="w-[calc(100%-1px)] dashboard main-button" style={{
                padding: "0.75vh 0px",
                color: "white",
                background: "linear-gradient(45deg, #1800ff, rgb(165 31 31))",
                fontWeight: "900",
                borderRadius: "12px",
                border: "2px solid black",        
                marginLeft: 1,
            }}>Link QR <br className="mobile-only"/><span style={{fontSize:10, verticalAlign:"middle"}}>(not implemented yet)</span></button>
            </form>
            
            </div>
    <div id="qr-container" className="left-[50%] w-[calc(302px*1)] sm:w-[calc(302px*2)] md:w-[calc(302px*3)] lg:w-[calc(302px*4)] xl:w-[calc(302px*5)]" style={{
        transform: "translateX(-50%)",
        display: "flex",
        flexWrap: "wrap",
        position: "absolute",
        marginTop: "40px",
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
                display:'flex',
                pointerEvents: "none",
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
