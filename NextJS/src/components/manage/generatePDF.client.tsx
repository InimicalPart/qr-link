"use client";
import Image from "next/image";
import React, { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom'

export default function PDFButton({
    token,
    apiURL,
    id,
    style = {},
    className = ""
}: {
        token: string,
        apiURL: string,
        id: string,
        style?: object,
        className?: string
}) {
    const [disabled, setDisabled] = useState(false)


    "use client"
        console.log(id)
        function clicked() {
            setDisabled(true);
            (document.getElementById("genPDFButton") as HTMLButtonElement).innerText = "Generating PDF...";
            fetch(`${apiURL}/qrcode/${id}?export=pdf`, {
                headers: {
                    Accept: "application/json",
                    Authorization: token
                },
            }).then((res) => res.json()).then((res) => {
                document.getElementById("genPDF").setAttribute("href", res.pdf)
                document.getElementById("genPDF").setAttribute("download", "qrcode.pdf")
                document.getElementById("genPDF").innerHTML = `Download PDF`
                setDisabled(false);
            })
        }

      return (
        <>
        <a id="genPDF" style={style} aria-disabled={disabled} className={className}><button style={{width:"100%"}} id="genPDFButton" disabled={disabled} onClick={clicked}>Generate PDF</button></a>
        </>
      );
}