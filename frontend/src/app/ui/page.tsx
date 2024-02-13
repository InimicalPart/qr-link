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
const API_URL = process.env.API_URL ?? "http://localhost:3000"
export default async function Home() {
    async function logout() {
        "use server";
        cookies().delete("token")
        redirect("/ui/login")
    }

    async function manageQR(form: FormData) {
        "use server";
        const id = form.get("id")
        console.log("A-",id)
        if (id) {
            redirect(`/ui/manage/${id}`)
        }
    }

    async function addQR() {
        "use server";
        redirect("/ui/create")
    }


    if (cookies()?.get("token")?.value) {
        let valid = false
        await jwtVerify(cookies().get("token").value, secret).then(()=>{
            valid = true
        }).catch(()=>{
            valid = false
        })
        if (!valid) redirect("/ui/login")
    } else {
        redirect("/ui/login")
    }
    return (
      <div>
        {/* <span id="apiurl" style={{ display: "none" }}>{process.env.API_URL ?? "http://localhost:3000"}</span> */}
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
        {/* <form action={manageQR} className="qr select-none" id="manage-qr-form" style={{
            display: "none",
            border: "1px black solid",
            justifyContent: "flex-start",
            flexDirection: "column",
        }}>
            <input type="hidden" name="id" id="qr-id-input" value="181a9421-3b20-4a3e-bec1-4e29f567b60f"/>
            <button title="Click to manage" className="qr select-none" id="sample-qr" style={{
                paddingLeft: "25px",
                paddingRight: "25px",
                paddingBottom: "10px",
            }}>
                <Image id="qr-img" src="" width={250} height={250} alt="qrcode.png" style={{
                    position: "relative",
                    top: "8px",
                    width: "250px",
                    height: "250px",
                }}></Image>
                <div id="information" style={{textAlign: "center"}}>
                    <p className="information" id="qr-id-cntr">ID:<br/><b><span id="qr-id">181a9421-3b20-4a3e-bec1-4e29f567b60f</span></b></p>
                    <p className="information" id="qr-name-cntr">Name:<br/><b><span id="qr-name">Some QR Code</span></b></p>
                    <p className="information" id="qr-description-cntr">Description<br/><b><span id="qr-description">Some long description that I will use to test if this works or not.</span></b></p>
                    <p className="information" id="qr-createdat-cntr">Created At:<br/><b><span id="qr-createdat">2024-01-29T12:02:48.939Z</span></b></p>
                    <p className="information" id="qr-updatedat-cntr">Last Updated:<br/><b><span id="qr-updatedat">2024-01-29T12:02:48.939Z</span></b></p>
                    <p className="information" id="qr-scancount-cntr">Scan Count:<br/><b><span id="qr-scancount">0</span></b></p>
                    <p className="information" id="qr-expires-cntr">Expires:<br/><b><span id="qr-expires">Never</span></b></p>
                    <p className="information" id="qr-valid-cntr">Valid:<br/><b><span id="qr-valid" style={{color:"#3bc53b"}}>YES</span></b></p>
                </div>
            </button>
        </form> */}
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
    <Script src="/res/js/index.js"/>
  </div>
  );
}
