"use client"

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

export default function QRCodeImage({
    qrCodeDetails,
    API_URL
}:{
    qrCodeDetails?: any,
    API_URL: string
}) {
    const templateDataURL = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`
    const [id, setId] = useState(qrCodeDetails?.id ?? "HelloFromQRLDeveloper");
    const [dataURL, setDataURL] = useState(templateDataURL);
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
        const generateQRCode = async () => {
            const qrCodeDataURL = await QRCode.toDataURL(`${API_URL}/qrcode/${id?id:"HelloFromQRLDeveloper"}/handler`, { errorCorrectionLevel: "H", width:250 });
            return qrCodeDataURL;
        }
        generateQRCode().then((dataurl)=>{
            setDataURL(dataurl)
        }) 
    }, [id, API_URL])




    return (<Image id="qr-img" src={dataURL} alt={""} width={250} height={250} />)
}