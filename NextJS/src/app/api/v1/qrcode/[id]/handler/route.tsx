import { NextRequest, NextResponse } from "next/server"
import {QRLinkGlobal} from "@/types/api/v1/global"
import { saveQR } from "@/utilities/api/v1/database"
import querystring from "querystring"
declare const global: QRLinkGlobal

export async function GET(request: NextRequest, {params}:{params:{id:string}}): Promise<NextResponse> {
    const { id } = params
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      }), { status: 400 });
    }
    // Make sure request is fresh
    if (!request.nextUrl.searchParams.get("_")) {
      let nowFlipped = new Date().getTime().toString().split("").reverse().join("") // This is to confuse potential attackers that might try to add fake scans. Will it stop them for long? uh... no.
      return NextResponse.redirect(new URL(process.env.API_URL + "/qrcode/" + id + "/handler?_=" + Buffer.from(nowFlipped).toString("base64"))) // By doing this, /qrcode/:id/handler will not show up in the user's history, preventing them from going back to the QR-code after it has been scanned which also prevents a fake scan count
    } else {
      const then = new Date(parseInt(Buffer.from(request.nextUrl.searchParams.get("_") as string, "base64").toString("utf-8").split("").reverse().join("")))
      const now = new Date().getTime()
      if (now - then.getTime() > 2000 || then.getTime() - now > 0) { 
        return new NextResponse(JSON.stringify({error: "INVALID", message: "This request is invalid."}), {status: 400})
      }
    }
    console.log("[-QR-] QR-code was scanned: " + id);
    const redirectRequiresInfoFromUser = ["location", "user-agent"].includes(global.QRCodeTable[id].type)
    const redirect_to = redirectRequiresInfoFromUser ? null : global.QRCodeTable[id].getRedirectTo()

    if (global.QRCodeTable[id].isExpired()) {
        console.log('[-WS-] The client tried to connect to an expired QR-code');

        if (global.QRCodeTable[id].hasAfterExpiry()) {
            if (!redirectRequiresInfoFromUser) {
                console.log("[-WS-] Sending client to after_expiry URL...")
                const after_expiry = global.QRCodeTable[id].getRedirectTo() //! .getRedirectTo() will return the after_expiry URL if the QR-code is expired   
                return NextResponse.redirect(after_expiry)
            }
        } else {   
            return new NextResponse(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>QRLink</title>
            </head>
            <body>
                <p>This QR-code has expired.</p>
            </body>
            </html>`, { status: 400 });
        }
    }
    
    if (global.QRCodeTable[id].wantsScanData() || redirectRequiresInfoFromUser) {
        //! Return the HTML page that will connect to this endpoint using WebSocket, get the scan data and send it back to the server
        //! where the server will then redirect the user to the URL that the QR-code wants to redirect them to based on the scan data
        return new NextResponse(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>QRLink SDG</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ClientJS/0.2.1/client.min.js" integrity="sha512-2WLGNBqBSz+HMXWugyIdkJNr6fPanvXsjj5ivuMzmztNgKVaJHJIcn6tkqmVoV4EKJYdzlLfNi0O1K3e1EtWAQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
            <style>
                * {
                    font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
                }
                .extended {
                    margin-left:20px !important;
                }
                .listitem {
                    display: list-item;
                    margin:0;
                    list-style-position: inside;
                    list-style-type: disc;
                }
                #accept, #deny {
                    padding: 10px 20px;
                    border-radius: 8px;
                }
                * {
                    font-size: 15pt;
                }
            </style>
        </head>
        <body>
            <p id="status">Please hold on while we communicate with the server...</p>
            <div style="display:flex;flex-wrap:nowrap;gap:10px;">
                <button id="accept" style="display: none;">Accept</button>
                <button id="deny" style="display: none;">Deny</button>
            </div>
            <script>
                (async()=>{
                    let client = new ClientJS();

                    async function getPos(){
                        return new Promise((resolve,reject) => {
                            navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy: true})
                        })
                    };

                    const ws = new WebSocket("${process.env.API_URL.startsWith("https") ? "wss" : "ws"}://${process.env.API_URL.replace(/(https|http):\/\//g,"")}/qrcode/${id}/handler"+window.location.search);
                    ws.onopen = () => {
                        console.log("[-QR-] WebSocket connection established for QR-code " + "${id}");
                    }
                    ws.onmessage = (event) => {
                        let parsed = {}
                        try {
                            parsed = JSON.parse(event.data)
                        } catch (e) {
                            console.error("[-QR-] Error parsing JSON: " + e.message)
                            document.getElementById("status").innerText = "An error occurred while parsing the data from the server."
                        }
                        console.log(">", parsed)
                        if (parsed.type == "scanData") {
                            const serverWants = {
                                fingerprint: parsed.data.fingerprint ?? false,
                                location: parsed.data.location ?? false,
                                "user-agent": parsed.data["user-agent"] ?? false,
                                ip: parsed.data.ip ?? false
                            }

                            const isLocationRequired = parsed.data.location_required ?? false
                            const isUserAgentRequired = parsed.data["user_agent_required"] ?? false

                            const clientHas = {
                                fingerprint: null,
                                location: null,
                                "user-agent": null,
                                ip: null
                            }

                            if (isLocationRequired || isUserAgentRequired) {
                                document.getElementById("deny").onclick = () => {
                                    ws.send(JSON.stringify({type: "denied"}))
                                    ws.close()
                                    document.getElementById("accept").style.display = "none"
                                    document.getElementById("deny").style.display = "none"
                                    document.getElementById("status").innerText = "You have denied the request. None of your information has been sent to the server."
                                }
                            }

                            document.getElementById("accept").onclick = async () => {
                                document.getElementById("accept").disabled = true
                                document.getElementById("deny").disabled = true
                                document.getElementById("accept").innerText = "..."
                                document.getElementById("deny").innerText = "..."
                                const fingerprintChecked = document.getElementById("fingerprint")?.checked
                                const locationChecked = document.getElementById("location")?.checked
                                const userAgentChecked = document.getElementById("useragent")?.checked
                                const ipChecked = document.getElementById("ip")?.checked

                                document.getElementById("status").innerText = "Please wait while we attempt to grab the information..."

                                if (serverWants.fingerprint && fingerprintChecked) {
                                    clientHas.fingerprint = client.getCustomFingerprint(client.getBrowserData().ua,client.getCanvasPrint())
                                }
                                if (serverWants.location && (locationChecked || isLocationRequired)) {
                                    if (navigator.geolocation) {
                                        let res = await getPos().then((pos)=>{
                                            clientHas.location = {
                                                latitude: pos.coords.latitude,
                                                longitude: pos.coords.longitude,
                                                accuracy: pos.coords.accuracy
                                            }
                                        }).catch((err)=>{
                                            if (isLocationRequired) {
                                                document.getElementById("status").innerText = "This QR-code requires location to be sent to the server, but you have denied access to your location. Please allow access to your location and rescan the QR-code."
                                                return 1
                                            }
                                        })
                                        if (res == 1) {
                                            ws.close()
                                            return
                                        }
                                    } else {
                                        if (isLocationRequired) {
                                            document.getElementById("status").innerText = "This QR-code requires location to be sent to the server, but your browser does not support it. Please use a different browser."
                                            return
                                        }
                                    };
                                }
                                if (serverWants["user-agent"] && (userAgentChecked || isUserAgentRequired)) {
                                    clientHas["user-agent"] = client.getBrowserData().ua
                                    if (isUserAgentRequired && !clientHas["user-agent"]) {
                                        document.getElementById("status").innerText = "This QR-code requires device and browser information to be sent to the server, but your browser does not support it. Please use a different browser."
                                        return
                                    }
                                }
                                if (serverWants.ip && ipChecked) {
                                    // make request to ipinfo.io/json
                                    clientHas.ip = (await fetch("https://ipinfo.io/json").then((res)=>res.json()).catch(e=>e)).ip ?? "${request.headers.get("x-forwarded-for") ?? request.ip}";
                                }
                                document.getElementById("status").innerText = "Please wait while we send the information to the server..."
                                console.log("<", JSON.stringify({type: "scanData", data: {
                                    fingerprint: clientHas.fingerprint,
                                    location: clientHas.location,
                                    "user-agent": clientHas["user-agent"],
                                    ip: clientHas.ip
                                }}))
                                ws.send(JSON.stringify({type: "scanData", data: {
                                    fingerprint: clientHas.fingerprint,
                                    location: clientHas.location,
                                    "user-agent": clientHas["user-agent"],
                                    ip: clientHas.ip
                                }}))
                            }
                            document.getElementById("status").innerText = "The owner of this QR-code wants to know the following information about you, please uncheck the boxes for the information you do not want to send:"
                            document.getElementById("status").innerHTML += '<br>'
                            if (serverWants.fingerprint) {
                                document.getElementById("status").innerHTML += '<p class="extended listitem"><input checked type="checkbox" id="fingerprint"></input> Your device\\'s unique identifier (device fingerprint)</p>'
                            }
                            if (serverWants.location) {
                                document.getElementById("status").innerHTML += '<p class="extended listitem"><input checked type="checkbox" id="location"></input> Your current location</p>'
                            }
                            if (serverWants["user-agent"]) {
                                document.getElementById("status").innerHTML += '<p class="extended listitem"><input checked type="checkbox" id="useragent"></input> Which device and browser you\\'re using</p>'
                            }
                            if (serverWants.ip) {
                                document.getElementById("status").innerHTML += '<p class="extended listitem"><input checked type="checkbox" id="ip"></input> Your IP address</p>'
                            }

                            if (isLocationRequired || isUserAgentRequired) {
                                document.getElementById("status").innerHTML += "<br><b>Requirements: (has to be provided to continue)</b>"
                            }

                            if (isLocationRequired) {
                                document.getElementById("status").innerHTML += '<p class="extended listitem">Location</p>'
                            }
                            if (isUserAgentRequired) {
                                document.getElementById("status").innerHTML += '<p class="extended listitem">Device and Browser information</p>'
                            }

                            const disabledReasons = []
                            if (serverWants.location && isLocationRequired) {
                                document.getElementById("location").addEventListener("change",(e)=>{
                                    if (e.target.checked) {
                                        disabledReasons.splice(disabledReasons.indexOf("location"),1)
                                        if (disabledReasons.length == 0) document.getElementById("accept").disabled = false
                                    } else {
                                        disabledReasons.push("location")
                                        document.getElementById("accept").disabled = true
                                    }
                                })
                            }
                            if (serverWants["user-agent"] && isUserAgentRequired) {
                                document.getElementById("useragent").addEventListener("change",(e)=>{
                                    if (e.target.checked) {
                                        disabledReasons.splice(disabledReasons.indexOf("useragent"),1)
                                        if (disabledReasons.length == 0) document.getElementById("accept").disabled = false
                                    } else {
                                        disabledReasons.push("useragent")
                                        document.getElementById("accept").disabled = true
                                    }
                                })
                            }



                            document.getElementById("accept").style.display = "block"
                            if (isLocationRequired || isUserAgentRequired) document.getElementById("deny").style.display = "block"


                            
                        } else if (parsed.type == "redirect") {
                            const uri = parsed.data
                            ws.close()
                            if (uri == "nil") {
                                const qrType = parsed.qrType

                                if (qrType == "location") document.getElementById("status").innerHTML = "This QR-code is a location-based QR-code. Based on your location, you are not in any defined zone. Therefore, you will not be redirected. If you believe this is an error, please try again or move a bit closer to the location."
                                else if (qrType == "user-agent") document.getElementById("status").innerHTML = "This QR-code is a user-agent based QR-code. Your device and browser does not match any of the defined user-agents. Therefore, you will not be redirected. Please use a different device or browser."
                                if (parsed.potential_reasons) {
                                    document.getElementById("status").innerHTML += "<br><br><b>Potential reasons:</b>"
                                    if (parsed.potential_reasons) {
                                        for (let reason of Object.keys(parsed.potential_reasons)) {
                                            document.getElementById("status").innerHTML += "<p class='extended listitem'>"+reason+"</p>"
                                        }
                                    }
                                }
                                document.getElementById("accept").style.display = "none"
                                document.getElementById("deny").style.display = "none"
                                return
                            }
                            // if uri is vcard
                            if (uri.toLowerCase().startsWith("begin:vcard") && uri.toLowerCase().endsWith("end:vcard")){
                                console.log("[-QR-] Redirecting to vCard: " + uri);
                                const meta = document.createElement("meta")
                                meta.httpEquiv = "refresh"
                                meta.content = "0;url=data:text/vcard;charset=utf-8," + encodeURIComponent(uri)
                                document.head.appendChild(meta)
                                document.getElementById("status").innerHTML = "Redirecting... If you do not get redirected: <a download='vcard_${new Date().getTime()}.vcf' href='data:text/vcard;charset=utf-8," + encodeURIComponent(uri) + "'>click here</a>"
                            } else {
                                console.log("[-QR-] Redirecting to: " + uri);
                                window.location.href = uri
                            }
                            
                        } else if (parsed.error) {
                            document.getElementById("status").innerText = "Err: " + parsed.message
                            ws.close()
                        
                        }
                    }
                })()
            </script>
        </body>
        </html>

        `,{
            status: 200,
            headers: {
                "Content-Type": "text/html"
            }
        })
    } else {
        global.QRCodeTable[id].scanData.push({
            timestamp: new Date()
        })
        global.QRCodeTable[id].scanCount++;
        saveQR(id, global.QRCodeTable[id], true)
    }

    if (redirect_to) {
        //! if redirect_to is vcard
        if (redirect_to.toLowerCase().startsWith("begin:vcard") && redirect_to.toLowerCase().endsWith("end:vcard")){
            console.log("[-QR-] Redirecting to vCard: " + redirect_to.replace(/\n/g,"%0A"));
            return new NextResponse(redirect_to, { status: 200, headers:{
                "Content-Type": "text/vcard",
                "Content-Disposition": "attachment; filename=vcard_"+new Date().getTime()+".vcf"
            } });
        } else {
            console.log("[-QR-] Redirecting to: " + redirect_to);
            return NextResponse.redirect(redirect_to)
        }
    } else {
        console.log("[-QR-] Err! No redirect URL provided for QR-code " + id);
        return new NextResponse(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>QRLink</title>
            </head>
            <body>
                <p>Something went wrong when we tried to redirect you. This error has been logged.</p>
            </body>
            </html>`, { status: 500 });
    
    }
}


export function SOCKET(
    client: import('ws').WebSocket,
    request: import('http').IncomingMessage,
    _server: import('ws').WebSocketServer,
) {
    const id = request.url.split("/")[4] //! s**t solution but i think that this is the only way to get the id
    console.log('[-WS-] A client is trying to connect to QR-code with ID ' + id);
    
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      console.log('[-WS-] The client tried to connect to a non-existing QR-code');
      client.send(JSON.stringify({error: "INVALID_ID", message: "Invalid ID provided."}))
      client.close()
      return
    }

    const redirectRequiresInfoFromUser = ["location", "user-agent"].includes(global.QRCodeTable[id].type)
    if (global.QRCodeTable[id].isExpired()) {
        console.log('[-WS-] The client tried to connect to an expired QR-code');

        if (global.QRCodeTable[id].hasAfterExpiry()) {
            if (!redirectRequiresInfoFromUser) {
                console.log("[-WS-] Sending client to after_expiry URL...")
                const after_expiry = global.QRCodeTable[id].getRedirectTo() //! .getRedirectTo() will return the after_expiry URL if the QR-code is expired   
                console.log("<", JSON.stringify({type: "redirect", data: after_expiry}))
                client.send(JSON.stringify({type: "redirect", data: after_expiry}))
                client.close()
                return
            }
        } else {   
            client.send(JSON.stringify({error: "EXPIRED", message: "QR-code has expired."}))
            client.close()
            return
        }
    }

    if (!global.QRCodeTable[id].wantsScanData() && !redirectRequiresInfoFromUser) {
        console.log('[-WS-] The client tried to connect to a QR-code that does not want scan data');
        client.send(JSON.stringify({error: "SCAN_DATA_NOT_ENABLED", message: "Scan data is not enabled for this QR-code."}))
        client.close()
        return
    }
    
    if (!querystring.parse(request.url.split("?")[1] ?? "")._) {
        console.log('[-WS-] The client tried to connect to the QR-code with an invalid request');
        client.send(JSON.stringify({error: "INVALID", message: "This request is invalid."}))
        client.close()
    } else {
        const parsedQuery = querystring.parse(request.url.split("?")[1] ?? "")
        const then = new Date(parseInt(Buffer.from(parsedQuery._ as string, "base64").toString("utf-8").split("").reverse().join("")))
        const now = new Date().getTime()
        if (now - then.getTime() > 2000 || then.getTime() - now > 0) {
            console.log('[-WS-] The client tried to connect to the QR-code with an invalid request');
            client.send(JSON.stringify({error: "INVALID", message: "This request is invalid."}))
            client.close()
            return
        }
      }

      console.log('[-WS-] The client has connected to the QR-code with ID ' + id);

    const scanDataSettings = global.QRCodeTable[id].isExpired() ? {
        fingerprint: false,
        ip: false,
        location: global.QRCodeTable[id].type == "location",
        location_required: global.QRCodeTable[id].type == "location",
        "user-agent": global.QRCodeTable[id].type == "user-agent",
        user_agent_required: global.QRCodeTable[id].type == "user-agent"
    } : global.QRCodeTable[id].getScanDataSettings()
    
    if (global.QRCodeTable[id].type == "location") {
        scanDataSettings.location = true
        scanDataSettings.location_required = true
    } else if (global.QRCodeTable[id].type == "user-agent") {
        scanDataSettings["user-agent"] = true
        scanDataSettings.user_agent_required = true
    }



    console.log("<", JSON.stringify({type: "scanData", data: {
            fingerprint: scanDataSettings.fingerprint ?? false,
            ip: scanDataSettings.ip ?? false,
            location: scanDataSettings.location,
            location_required: scanDataSettings.location_required,
            "user-agent": scanDataSettings["user-agent"],
            user_agent_required: scanDataSettings.user_agent_required,
    }}))
    client.send(JSON.stringify({type: "scanData", data: {
            fingerprint: scanDataSettings.fingerprint ?? false,
            ip: scanDataSettings.ip ?? false,
            location: scanDataSettings.location,
            location_required: scanDataSettings.location_required,
            "user-agent": scanDataSettings["user-agent"],
            user_agent_required: scanDataSettings.user_agent_required,
        }
    }))
    let websocketPing = setInterval(() => {
        client.ping()
        console.log("[-WS-] Sent ping to client")
    }, 30000)

    client.on("ping", () => {
        console.log("[-WS-] Received ping from client")
        client.pong()
    })
    client.on("pong", () => {
        console.log("[-WS-] Received pong from client")
    })
    client.on('message', async (message) => {
        try {
            const parsed = JSON.parse(message.toString())
            console.log(">", message.toString())
            if (parsed.type == "scanData") {
                console.log('[-WS-] The client has sent scan data for QR-code ' + id);
                if (!parsed.data.location && (scanDataSettings.location_required)) {
                    console.log('[-WS-] The client tried to send scan data without location for a QR-code that requires it');
                    console.log("<", JSON.stringify({error: "LOCATION_REQUIRED", message: "Location is required for this QR-code."}))
                    client.send(JSON.stringify({error: "LOCATION_REQUIRED", message: "Location is required for this QR-code."}))
                    client.close()
                    return
                }
                if (!parsed.data["user-agent"] && scanDataSettings.user_agent_required) {
                    console.log('[-WS-] The client tried to send scan data without user-agent for a QR-code that requires it');
                    console.log("<", JSON.stringify({error: "USER_AGENT_REQUIRED", message: "User-Agent is required for this QR-code."}))
                    client.send(JSON.stringify({error: "USER_AGENT_REQUIRED", message: "User-Agent is required for this QR-code."}))
                    client.close()
                    return
                }
                let scanData: {
                    fingerprint: string | undefined,
                    location: {
                        latitude: number,
                        longitude: number,
                        accuracy: number
                    } | undefined,
                    timestamp: Date | undefined,
                    "user-agent": string | undefined,
                    ip: string | undefined
                } = {
                    fingerprint: undefined,
                    location: undefined,
                    timestamp: undefined,
                    "user-agent": undefined,
                    ip: undefined
                }
                if (global.QRCodeTable[id].wantsScanData() || redirectRequiresInfoFromUser) {
                    scanData = {
                        fingerprint: parsed.data.fingerprint ?? undefined,
                        location: parsed.data.location ?? undefined,
                        timestamp: new Date(),
                        "user-agent": parsed.data["user-agent"] ?? undefined,
                        ip: parsed.data.ip ?? undefined
                    }
                    
                    Object.keys(scanData).forEach((key) => {
                        if (scanData[key as keyof typeof scanData] == undefined) delete scanData[key as keyof typeof scanData]
                    })
                    if (!global.QRCodeTable[id].isExpired())  global.QRCodeTable[id].scanData.push(scanData)
                }
                if (!global.QRCodeTable[id].isExpired()) global.QRCodeTable[id].scanCount++

                saveQR(id, global.QRCodeTable[id], true)

                const locationData = global.QRCodeTable[id].type == "location" ? parsed.data.location : undefined
                const userAgentData = global.QRCodeTable[id].type == "user-agent" ? parsed.data["user-agent"] : undefined

                const redirect_to = global.QRCodeTable[id].getRedirectTo(locationData ?? userAgentData)
                const encryptedScanData = await global.QRCodeTable[id].signScanData(scanData) // This is to prevent the client from tampering with the scan data while it is being sent to the redirect URL

                if (redirect_to == "nil") {
                    const potentialReason: {
                        accuracy?: string
                    } = {}
                    if (global.QRCodeTable[id].type == "location") {

                        
                        if (scanData.location.accuracy > 100) {
                            potentialReason["accuracy"] = "Your location accuracy is too low. (Accuracy: " + scanData.location.accuracy + "m)"
                        }
                    }
                        
                    console.log("<", JSON.stringify({type: "redirect", qrType: global.QRCodeTable[id].type, data: "nil", ...(Object.keys(potentialReason).length > 0 ? {potential_reasons:potentialReason} : {}) }))
                    client.send(JSON.stringify({type: "redirect", qrType: global.QRCodeTable[id].type, data: "nil", ...(Object.keys(potentialReason).length > 0 ? {potential_reasons:potentialReason} : {}) }))
                    if (client.readyState == client.OPEN) client.close()
                    return
                }


                if (redirect_to) {
                    const addition = (encryptedScanData ? "?ql_scan="+encodeURIComponent(encryptedScanData) : "")
                    const isVCard = redirect_to.toLowerCase().startsWith("begin:vcard") && redirect_to.toLowerCase().endsWith("end:vcard")
                    console.log("<", JSON.stringify({type: "redirect", data: redirect_to + (isVCard ? "" : addition)}))
                    client.send(JSON.stringify({type: "redirect", data: redirect_to + (isVCard ? "" : addition)}))
                } else {
                    console.log("<", JSON.stringify({error: "NO_REDIRECT", message: "No redirect URL provided."}))
                    client.send(JSON.stringify({error: "NO_REDIRECT", message: "No redirect URL provided."}))
                }
                
            } else if (parsed.type == "denied") {
                console.log('[-WS-] The client has denied the request for scan data for QR-code ' + id);
                if (client.readyState == client.OPEN) client.close()
            }
        } catch (e) {
            console.log('[-WS-] The client tried to send invalid JSON');
            console.log("<", JSON.stringify({error: "INVALID_JSON", message: "Invalid JSON."}))
            client.send(JSON.stringify({error: "INVALID_JSON", message: "Invalid JSON."}))
            client.close()
        }
    })
    
    
    client.on('close', () => {
      console.log('[-WS-] A client has disconnected.');
        clearInterval(websocketPing)
    });
}