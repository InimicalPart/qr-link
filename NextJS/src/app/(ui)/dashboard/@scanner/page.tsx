"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import Image from "next/image";
import "./scanner.css";

const QRReader = dynamic(() => import("react-qr-scanner"), {
  ssr: false,
}) as any;
let cooldown: {
    [key: string]: Date
} = {}


export default function QRScannerModal({
    callback,
    API_URL
}:{
    callback: (data: any) => Promise<{
        valid: boolean,
        message?: string,
        redirect_to?: string
    }>,
    API_URL: string
}) {

    const [result, setResult] = useState({text: "", resultPoints: []})
    const [enabled, setEnabled] = useState(true)
    const [scannedImage, setScannedImage] = useState("")
    const [status, setStatus] = useState("Please scan a QRLink code")
    const [errored, setErrored] = useState(false)
    

    const alreadySeen: string[] = useMemo(()=>[],[])
    const previewStyle = {
        height: "auto",
        width: "auto",
      }

    const handleError = (err: Error) => {
        if (err.toString().includes("Permission denied")) {
            setEnabled(false)
            setStatus("Camera access was denied. Please allow camera access to scan QRLink codes")
        } else console.error("Error:",err)
    }


    const hasCamera = async () => {
        return new Promise<boolean>((resolve, reject) => {
            const result = navigator.mediaDevices.enumerateDevices().then(function (devices) {
                for(var i = 0; i < devices.length; i ++){
                    var device = devices[i];
                    if (device.kind === 'videoinput') {
                        return true
                    }
                };
                return false
            })
        
            resolve(result)
        })
    }

    const showLoadingOverlay = () => {
        const overlay = document.getElementById("overlay")
        if (overlay) {
            overlay.style.display = "flex"
        }
    }
    
    const handleScan = async (data: any) => {
        if (data) {
            if (alreadySeen.includes(data.text)) return   

            if (Object.keys(cooldown).includes(Buffer.from(data.text).toString("hex"))) {
                if (new Date() < new Date(cooldown[Buffer.from(data.text).toString("hex")])) {
                    return
                } else {
                    delete cooldown[Buffer.from(data.text).toString("hex")]
                }
            }

            const canvas = document.createElement("canvas")
            const videoStream = Array.from(document.getElementsByTagName("video")).find(a=>a.id=="qr-scanner") as HTMLVideoElement

            if (videoStream) {
                canvas.width = videoStream.clientWidth
                canvas.height = videoStream.clientHeight
                document.getElementById("status").style.maxWidth = videoStream.clientWidth + "px"
                document.getElementById("overlay").style.width = videoStream.clientWidth + "px"
                document.getElementById("overlay").style.height = videoStream.clientHeight + "px"
                if (!isQRLink(data.text)) {
                    setErrored(true)
                    setStatus("The scanned code is not a QRLink code. Please try again...")
                    document.getElementById("overlay").style.display = "none"
                    Array.from(document.getElementById("scannedPoints").children).forEach((child: Element) => {
                        child.remove()
                    })
                    setEnabled(true)
                    return
                
                }
                const ctx = canvas.getContext("2d")
                if (ctx) {
                    ctx.drawImage(videoStream, 0, 0, canvas.width, canvas.height)
                    setScannedImage(canvas.toDataURL("image/png"))
                    setEnabled(false)
                    setResult(data)
                } else {
                    console.log("No context")
                }
            } else {
                console.log("No video stream")
            }
        }
    }

      useEffect(()=>{
        hasCamera().then((hasCamera)=>{
            if (!hasCamera) {
                setEnabled(false)
                setErrored(true)
                setStatus("No camera detected. Please use a device with a camera to scan QRLink codes")
            }
        })
      })
      const isQRLink = useCallback((text: string) =>{
        return text.match(API_URL + "/qrcode/.{1,50}/handler")
    },[API_URL])

    useEffect(() => {
        const scannedPoints = document.getElementById("scannedPoints")
        const image = document.getElementById("scanned")
        if (scannedPoints) {
            scannedPoints.style.width = image?.clientWidth + "px"
            scannedPoints.style.height = image?.clientHeight + "px"
            scannedPoints.innerHTML = ""
            result.resultPoints.forEach((point: any) => {
                const pointDiv = document.createElement("div")
                pointDiv.style.position = "absolute"
                pointDiv.style.height = 3.5 *point.estimatedModuleSize + "px"
                pointDiv.style.width =  3.5 *point.estimatedModuleSize + "px"
                pointDiv.style.background = "red"
                pointDiv.style.left = `calc(${point.x}px - calc(${3.5*point.estimatedModuleSize}px / 2))`
                pointDiv.style.top = `calc(${point.y}px - calc(${3.5*point.estimatedModuleSize}px / 2))`
                pointDiv.style.borderRadius = "calc("+(3.5*point.estimatedModuleSize) + "px"+" / 6)"
                pointDiv.setAttribute("aria-label", point?.count)
                scannedPoints.appendChild(pointDiv)
            })
        }
        if (result.resultPoints.length > 0) {
            showLoadingOverlay()
            setEnabled(false)
            setErrored(false)
            setStatus("Processing...")
            if (isQRLink(result.text)) {
                setStatus("Processing... QRLink code detected")
            } else {
                alreadySeen.push(result.text)
                setErrored(true)
                setStatus("The scanned code is not a QRLink code. Please try again...")
                document.getElementById("overlay").style.display = "none"
                Array.from(document.getElementById("scannedPoints").children).forEach((child: Element) => {
                    child.remove()
                })
                setEnabled(true)
            }

            //callback is a server action
            callback(result.text).then((response:{
                valid: boolean,
                message?: string,
                redirect_to?: string
            })=>{
                console.log(response)

                if (response.valid) {
                    document.getElementById("closeModal")?.click()
                    if (response.redirect_to) {
                        setErrored(false)
                        setStatus("Redirecting...")
                        window.location.href = response.redirect_to
                    }
                } else {
                    setErrored(true)
                    setStatus(response.message)
                    cooldown[Buffer.from(result.text).toString("hex")] = new Date(new Date().setSeconds(new Date().getSeconds()+5))
                    console.log(cooldown)
                    document.getElementById("overlay").style.display = "none"
                    Array.from(document.getElementById("scannedPoints").children).forEach((child: Element) => {
                        child.remove()
                    })
                    setEnabled(true)
                }

            })


        }
    }, [result, alreadySeen, callback,isQRLink])
    




    return(
        <div style={{position:"relative"}}>
            <div id="scannedPoints" style={{
                zIndex: 5,
                position:"absolute"}}>
                
            </div>
            <div id="overlay" style={{
                background:"rgba(0,0,0,0.5)",
                zIndex: 10,
                display:"none",
                position:"absolute",
                justifyContent:"center",
                alignItems:"center"}}>
                <div className="loader scanner"></div> 
            </div>

          {enabled?
              <QRReader
              delay={100}
              style={{position:"relative",...previewStyle}}
              id="qr-scanner"
              onError={handleError}
              onScan={handleScan}
              constraints={{facingMode: "environment", audio:false, video:true}}
              />
              :
              <Image id="scanned" src={scannedImage} alt=""/>
            }
          <p id="status" style={{maxWidth:"100%", fontWeight:600, marginTop:10, color:errored ? "red" : "black"}}>{status}</p>
        </div>
      )

}