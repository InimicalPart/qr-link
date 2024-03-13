"use client"

import PDFButton from "../manage/generatePDF.client"
import { MouseEventHandler, useEffect, useState } from "react"

export default function ExportButtons({
    qrCodeDetails,
    id,
    token,
    style,
    className
}:{
    qrCodeDetails?: any,
    id?: string,
    token: string,
    style?: any,
    className?: string
}) {
    const qrcodeid = qrCodeDetails?.id ?? id
    const [svg, setSVG] = useState<string>("")
    useEffect(()=>{
        if (svg == "") {
            if (qrCodeDetails.svg) {
                let tempsvg = qrCodeDetails.svg
                if(!tempsvg.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
                    tempsvg = tempsvg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                if(!tempsvg.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
                    tempsvg = tempsvg.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
                }
        
                //add xml declaration
                tempsvg = '<?xml version="1.0" standalone="no"?>\n' + tempsvg;
        
                //convert svg source to URI data scheme.
                var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(tempsvg);
                setSVG(url)
            }
        }
    },[svg, qrCodeDetails.svg])

    const [png, setPNG] = useState<string>(qrCodeDetails.png)


    function exportQR(evt:any, type:string) {
        (document.getElementById(type) as HTMLAnchorElement).setAttribute("aria-disabled", "true");
        (document.getElementById(type) as HTMLAnchorElement).innerText = "Downloading...";


        if (type === "png") {
            if ((document.getElementById(type) as HTMLAnchorElement).getAttribute("aria-id") === qrcodeid) {
                const a = document.createElement('a');
                a.href = png;
                a.download = "qrcode-"+qrcodeid+".png";
                a.click();
                a.remove();
            } else if (qrcodeid == (qrCodeDetails?.id ?? id) && qrCodeDetails?.png) {
                    const a = document.createElement('a');
                    a.href = qrCodeDetails.png;
                    a.download = "qrcode-"+qrcodeid+".png";
                    a.click();
                    a.remove();
                } else {
                    fetch(`${process.env.API_URL ?? "http://localhost:8080/api/v1"}/qrcode/${qrcodeid}?export=png,svg`, {
                        headers: {
                            Accept: "application/json",
                            Authorization: token
                        },
                    }).then((res) => res.json()).then((data)=>{
                        (document.getElementById(type) as HTMLAnchorElement).setAttribute("aria-id", qrcodeid);
                        const a = document.createElement('a');
                        let tempsvg = data.svg
                        if(!tempsvg.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
                            tempsvg = tempsvg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                        }
                        if(!tempsvg.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
                            tempsvg = tempsvg.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
                        }
                        
                        //add xml declaration
                        tempsvg = '<?xml version="1.0" standalone="no"?>\n' + tempsvg;
                        
                        //convert svg source to URI data scheme.
                        var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(tempsvg);
                        setPNG(data.png)
                        setSVG(url)
                        a.href = data.png;
                        a.download = "qrcode-"+qrcodeid+".png";
                        a.click();
                        a.remove();
                    })
                }
        } else if (type === "svg") {
            if ((document.getElementById(type) as HTMLAnchorElement).getAttribute("aria-id") === qrcodeid) {
                const a = document.createElement('a');
                a.href = svg;
                a.download = "qrcode-"+qrcodeid+".svg";
                a.click();
                a.remove();
            } else if (qrcodeid == (qrCodeDetails?.id ?? id) && qrCodeDetails?.svg) {
                    const a = document.createElement('a');
                    
                    let tempsvg = qrCodeDetails.svg
                    if(!tempsvg.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
                        tempsvg = tempsvg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                    }
                    if(!tempsvg.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
                        tempsvg = tempsvg.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
                    }
                    
                    //add xml declaration
                    tempsvg = '<?xml version="1.0" standalone="no"?>\n' + tempsvg;
                    
                    //convert svg source to URI data scheme.
                    var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(tempsvg);
                    setSVG(url)
                    a.href = url;
                    a.download = "qrcode-"+qrcodeid+".svg";
                    a.click();
                    a.remove();
                } else {
                    fetch(`${process.env.API_URL ?? "http://localhost:8080/api/v1"}/qrcode/${qrcodeid}?export=png,svg`, {
                        headers: {
                            Accept: "application/json",
                            Authorization: token
                        },
                    }).then((res) => res.json()).then((data)=>{
                        (document.getElementById(type) as HTMLAnchorElement).setAttribute("aria-id", qrcodeid);
                        const a = document.createElement('a');
                        let tempsvg = data.svg
                        if(!tempsvg.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
                            tempsvg = tempsvg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                        }
                        if(!tempsvg.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
                            tempsvg = tempsvg.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
                        }
                        
                        //add xml declaration
                        tempsvg = '<?xml version="1.0" standalone="no"?>\n' + tempsvg;
                        
                        //convert svg source to URI data scheme.
                        var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(tempsvg);
                        setPNG(data.png)
                        setSVG(url)
                        a.href = url;
                        a.download = "qrcode-"+qrcodeid+".svg";
                        a.click();
                        a.remove();
                    })
                }

        }

        (document.getElementById(type) as HTMLAnchorElement).setAttribute("aria-disabled", "false");
        (document.getElementById(type) as HTMLAnchorElement).innerText = "Download "+type.toUpperCase();


    }

    return <div style={{
        position:"relative",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        width:300,
        height:80,
        left:"50%",
        transform:"translateX(-50%)",
        marginTop:20,
        gap: 5
    }}>
        <PDFButton token={token} apiURL={process.env.API_URL ?? "http://localhost:8080/api/v1"} id={qrcodeid} className={className}/>
        <a id="png" onClick={(e)=>exportQR(e,"png")} href={"#"} className={className}>Download PNG</a>
        <a id="svg" onClick={(e)=>exportQR(e,"svg")} href={"#"} className={className}>Download SVG</a>
    </div>
}