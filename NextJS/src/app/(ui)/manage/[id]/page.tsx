import Script from "next/script";
import Image from "next/image";
import "./manage.css"
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import GeneratePDFButton from "@/components/manage/generatePDF.client";
const API_URL = process.env.API_URL ?? "http://localhost:8080/api/v1"
const secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
);
export default async function Home({params}: {
    params: {
        id: string;
    }
}) {

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

    const qrCodeDetails = await fetch(`${API_URL}/qrcode/${params.id}`, {
        headers: {
            Accept: "application/json",
            Authorization: `${cookies().get("token").value}`
        },
    }).then((res) => res.json())
    
    
    return (<>
        <GeneratePDFButton id={params.id} token={cookies().get("token").value} apiURL={API_URL} />
            <div>{JSON.stringify(qrCodeDetails,null,2)}</div>
        </>
    );
}