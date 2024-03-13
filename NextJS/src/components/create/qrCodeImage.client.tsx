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
    const [dataURL, setDataURL] = useState(templateDataURL);
    
    useEffect(() => {
        const generateQRCode = async () => {
            const qrCodeDataURL = await QRCode.toDataURL(`${API_URL}/qrcode/${qrCodeDetails.id??"NO-ID"}/handler`, { errorCorrectionLevel: "H", width:250 });
            return qrCodeDataURL;
        }
        generateQRCode().then((dataurl)=>{
            setDataURL(dataurl)
        }) 
    }, [API_URL])




    return (<Image id="qr-img" src={dataURL} alt={""} width={250} height={250} />)
}