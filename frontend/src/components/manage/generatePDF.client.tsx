"use client";
import Image from "next/image";
import React, { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom'

export default function GeneratePDFButton({
    token,
    apiURL,
    id,
    style = {}
}: {
        token: string,
        apiURL: string,
        id: string,
        style?: object
}) {
    "use client"
        console.log(id)
        function clicked() {
            (document.getElementById("genPDFButton") as HTMLButtonElement).disabled = true;
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
            })
        }

      return (
        <>
        <a id="genPDF" style={style}><button id="genPDFButton" onClick={clicked}>Generate PDF</button></a>
        </>
      );
}