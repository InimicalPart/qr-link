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
        const [pdf, setPDF] = useState("")
        function clicked() {
            if (disabled) return;
            if (pdf != "") {
                const a = document.createElement('a');
                a.href = pdf;
                a.download = "qrcode-"+id+".pdf";
                a.click();
                a.remove();
            };
            setDisabled(true);
            document.getElementById("genPDF").innerText = "Generating PDF...";
            fetch(`${apiURL}/qrcode/${id}?export=pdf`, {
                headers: {
                    Accept: "application/json",
                    Authorization: "Bearer " + token
                },
            }).then((res) => res.json()).then((res) => {

                //add an anchor tag to the document and click it
                const a = document.createElement('a');
                a.href = res.pdf;
                a.download = "qrcode-"+id+".pdf";
                a.click();
                a.remove();


                document.getElementById("genPDF").innerText = `Download PDF`
                setPDF(res.pdf)
                setDisabled(false);
            })
        }

      return (
        <>
        <button id="genPDF" style={style} disabled={disabled} onClick={clicked} className={className}>Download PDF</button>
        </>
      );
}