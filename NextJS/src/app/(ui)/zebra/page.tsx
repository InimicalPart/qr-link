"use client";

import Script from "next/script";
import Image from "next/image";
// import { convert } from 'convert-svg-to-png';
//@ts-expect-error
import qz from "qz-tray"; //! Doesn't have typescript definitions, causing errors, which is why we have to use ts-expect-error
import { useEffect } from "react";
export default function Home() {
    return (
        <h1>Not Implemented</h1>
    )
    useEffect(() => {
        (async ()=>{
        //    return
           await qz.websocket.connect();
           const printers = await qz.printers.find();
           console.log(printers);
           // find printer starting with TTP
           const printer = printers.find((printer: any) =>
             printer.startsWith("TTP")
           );
           const config = qz.configs.create(printer, {
            // make printout larger
            // rasterize: true,
            altPrinting: true,
            encoding: "ISO-8859-1",
            // scaleContent: true,
            size: { width: 1000, height: 1000 },
            bounds: { x: 0, y: 0, width: 1000, height: 1000 },
           });
           // get "id" from query string
           const id = new URLSearchParams(location.search).get("id");
           if (!id) {
             throw new Error("No ID provided");
           }
           let resp = await fetch(`http://localhost:8080/api/v1/qrcode/${id}`, {
             headers: {
               Accept: "application/json",
             },
           })
             .then((res) => res.json())
             console.log(resp.qrcode.png)
            // return
            // let bud = fs.readFileSync

             let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>QR Code</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .qr-code {
                            width: 100%;
                            height: 100%;
                        }
                    </style>
                </head>
                <body>
                    ${resp.qrcode.svg.replace("<svg", '<svg class="qr-code"')} 
                </body>
                </html>
                `;
                console.log(html);
                // let converted = await convert(resp.qrcode.svg, {
                //     height: 400,
                //     width: 400,
                // });
                // console.log(converted);

                var data = [
                    '\nN\n',
                    { 
                     type: 'raw', format: 'image', flavor: 'file', data: '/res/img/cbimage.png', 
                     options: { language: "EPL", x: 10, y: 10 } 
                    },
                    '\nP1,1\n'
                    ];
                 
                    console.log(data)
                await qz
              .print(config, data).then(()=>{console.log("done")})


})()
}, []);
    return (
            <div>
                <Image src="/res/img/qrcode.png" width="512" height="512" alt={""} />
            </div>
        );
}
