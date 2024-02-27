"use client"

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

export default function QRCodeImage() {
    const templateDataURL = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`
    const [id, setId] = useState("HelloFromQRLDeveloper");
    const [dataURL, setDataURL] = useState(templateDataURL);
    const API_URL = (process.env.API_URL ?? "http://localhost:8080/api/v1")

    useEffect(() => {
        function setState(e: any) {
            setId((e.target as HTMLInputElement).value.substring(0, 50)) // Limit to 50 characters
        }
        document.getElementById("qr-id")?.addEventListener("input", setState)

        return () => {
            document.getElementById("qr-id")?.removeEventListener("input", setState)
        }
    })

    useEffect(() => {
        generateQRCode().then((dataurl)=>{
            setDataURL(dataurl)
        }) 
    }, [id])

    const generateQRCode = async () => {
        const qrCodeDataURL = await QRCode.toDataURL(`${API_URL}/qrcode/${id?id:"HelloFromQRLDeveloper"}/handler`, { errorCorrectionLevel: "H", width:250 });
        return qrCodeDataURL;
    }


    return (<Image id="qr-img" src={dataURL} alt={""} width={250} height={250} />)
}