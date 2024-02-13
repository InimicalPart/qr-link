import crypto from "crypto";
import { QRCodeData } from "../types/QRCode";
import { resolveID } from "./authentication";
import QRCodeGenerator from "qrcode";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import moment from "moment-timezone";


export async function randomString(length: number) {
    return new Promise<string>((resolve, reject) => {
      crypto.randomBytes(length, function (err, buffer) {
        if (err) {
          reject(err);
        }
        resolve(buffer.toString("hex"));
      });
    });
  }

export async function generateTrackingCode(id, options:Partial<{
    serverURL: string,
    port: number,
    currentAction: Partial<QRCodeData>,
    request: any
}>={}) {
    let body = '<script src="https://cdnjs.cloudflare.com/ajax/libs/ClientJS/0.2.1/client.min.js" integrity="sha512-2WLGNBqBSz+HMXWugyIdkJNr6fPanvXsjj5ivuMzmztNgKVaJHJIcn6tkqmVoV4EKJYdzlLfNi0O1K3e1EtWAQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n'
    let javascriptCode = `(async()=>{let client = new ClientJS();\nconst finalData = {};\nasync function getPos(){return new Promise((resolve,reject)=>{navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy: true})})};\n`

    if (global.QRCodeTable[id].settings.scanData.fingerprint) {
        javascriptCode += `finalData.fingerprint = client.getCustomFingerprint(client.getBrowserData().ua,client.getCanvasPrint())\n`
    }
    if (global.QRCodeTable[id].settings.scanData["user-agent"]) {
        javascriptCode += `finalData["user-agent"] = client.getBrowserData().ua ?? "${options.request.headers["user-agent"]}"\n`
    }
    if (global.QRCodeTable[id].settings.scanData.timestamp) {
        javascriptCode += `finalData.timestamp = ${new Date().getTime()}\n`
    }
    if (global.QRCodeTable[id].settings.scanData.ip) {
        javascriptCode += `finalData.ip = (await (await fetch("https://api.ipify.org/?format=json")).json()).ip\n`
    }
    if (global.QRCodeTable[id].settings.scanData.location) {
        javascriptCode += `
        if (navigator.geolocation) {
            getPos().then((pos)=>{
            finalData.location = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
            }
            send_and_redirect()
        }).catch((err)=>{
            if (${global.QRCodeTable[id].settings.requirements.location}) {
                alert("This QR-code requires location to be sent to the server, but you have denied access to your location. Please allow access to your location and rescan the QR-code.")
                return
            } else {
                finalData.location = null
                send_and_redirect()
            }
        })} else {
            if (${global.QRCodeTable[id].settings.requirements.location}) {
                alert("This QR-code requires location to be sent to the server, but your browser does not support it. Please use a different browser.")
                return
            }
            finalData.location = null
            send_and_redirect()
        };\n`
    } else {
        javascriptCode += `\nsend_and_redirect();\n`
    }

    javascriptCode += `function send_and_redirect(){
        console.log("[QRCode] Sending data to server...")
        fetch("${options.serverURL + ":" + options.port}/qrcode/${id}/scan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(finalData)
        }).then(()=>{
            console.log("[QRCode] Redirecting to: " + "${options.currentAction.redirect_to}");
            window.location.href = "${options.currentAction.redirect_to}"
        }).catch((err)=>{
            alert("An error occured while sending your data to the server. Please try again later.")
        })
    }\n})()`

    return {
        body: body,
        javascript: javascriptCode
    } 
}



export async function QRCode2PDF(qrcode, id) {

    function settings2HTML(settings) {
        let rtrn = []
        let template = `<span>[TXT]</span>`

        rtrn.push(template.replace("[TXT]", "Get scan data -> " + (settings.getScanData ? "YES" : "NO")))
        if (settings.getScanData) {
            rtrn.push(template.replace("[TXT]", "Get Device Fingerprint -> " + (settings.scanData.fingerprint ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get User-Agent -> " + (settings.scanData["user-agent"] ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get Timestamp -> " + (settings.scanData.timestamp ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get IP -> " + (settings.scanData.ip ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get Location -> " + (settings.scanData.location ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Require Location -> " + (settings.requirements.location ? "YES" : "NO")))
        }
        return rtrn.join("<br>")
    }

    let owner: {
        object:string,
        id:string,
        email: string,
        emailVerified: boolean,
        firstName: string | null,
        lastName: string | null,
        createdAt: Date | string,
        updatedAt: Date|string
    } | null = null
    if (qrcode.linked_to) {
        owner = await resolveID(qrcode.linked_to)
    }
    const html = `
<!doctype html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>   
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    </head>
    <body>
        <div style="font-family: 'Inter', sans-serif;min-height:100%;position:absolute;min-width: 100%;top: 0;left: 0;">
            <img alt="QR Code" loading="eager" width="250" height="250" decoding="async" data-nimg="1" style="color:transparent;position:relative;left:50%;top:50px;transform:translateX(-50%)" src="${await QRCodeGenerator.toDataURL(global.serverURL + ":" + global.port  + "/qrcode/" + id + "/handler",{ errorCorrectionLevel: "H" })}"/>
            <hr style="position:relative;left:50%;transform:translateX(-50%);top:70px;width:80%;height:4px;background:#000000;border-radius:8px;"/>
            <div id="title" style="position: relative;left:50%;top: 80px;transform:translateX(-50%);width:60%;height:auto;text-align:center">
                <h1 id="name" style="font-size:30px;font-weight:900">DynamicQR</h1>
                <p id="id" style="font-size:16px;font-weight:500;color:#929292;bottom: 5px;position:relative">[${id}]</p>
            </div>
            <hr style="position: relative;left:50%;transform:translateX(-50%);top: 85px;width:50%;height:3px;background:#c1c1c1;border-radius:8px;">
            <div id="information" style="position: relative;left:50%;top: 100px;transform:translateX(-50%);width:60%;height:auto;text-align:center; font-weight:400;">
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-id-cntr">ID:<br><b>
                    <span id="qr-id">${id}</span>
                </b></p>
                ${qrcode.update_key ? `
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-id-cntr">Update Key:<br><b>
                    <span id="qr-updatekey">${qrcode.update_key}</span>
                </b></p>` : ""}
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-name-cntr">Name:<br><b>
                    <span id="qr-name">${qrcode.name ? qrcode.name : "---"}</span>
                </b></p>
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-description-cntr">Description<br><b>
                    <span id="qr-description">${qrcode.description ? qrcode.description : "---"}</span>
                </b></p>
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-createdat-cntr">Created At:<br><b>
                    <span id="qr-createdat">${new Date(qrcode.created).toUTCString()}</span>
                </b></p>
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-expires-cntr">Expires:<br><b>
                    <span id="qr-expires">${qrcode.expires ? new Date(qrcode.expires).toUTCString() : "Never"}</span>
                </b></p>
                ${qrcode.linked_to ? `
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-linkedto-cntr">Linked To:<br><b>
                    <span id="qr-linkedto">${owner.email}</span>
                </b></p>` : ""}
                ${qrcode.scanCount || qrcode.scanCount == 0  ? `
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-scan-cntr">Scan Count:<br><b>
                    <span id="qr-scan">${qrcode.scanCount}</span>
                </b></p>` : ""}
                ${qrcode.settings ? `
                <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-settings-cntr">Settings:<br><b>
                    ${settings2HTML(qrcode.settings)}
                </b></p>` : ""}
            </div>
        </div>
    </body>
</html>

`;
//TODO: use puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      defaultViewport: null,
    //   ignoreDefaultArgs: true,
      args: [
        "--mute-audio",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html,{
        waitUntil: "networkidle0"
    });
    // wait for the page to fully load
    await page.waitForSelector("body > div > img");
    // await page.waitForSelector("body > div > hr");
    await page.addStyleTag({ content: '@page { size: A4; line-height: inherit; }' });
    await page.pdf({ path: path.join(__dirname, "..","qrcode_"+id+".pdf"), format: "A4", printBackground: true, scale: 0.87, pageRanges: "1"});
    await browser.close();
    console.log("[QRCode] Generated PDF for QR-code " + id);
    let contents = fs.readFileSync(path.join(__dirname, "..","qrcode_"+id+".pdf"), 'base64');
    fs.unlinkSync(path.join(__dirname, "..","qrcode_"+id+".pdf"));
    return "data:application/pdf;base64," + contents;
}

export function getPassedTime(times: string[], timezone: string) {
    if (times.includes("ALL_DAY")) {
        return "ALL_DAY";
    }
    let diffs: number[] = []
    for (let time of times) {
        let nextChange = moment("1970-01-02T" + time).tz(timezone)
        let now = moment("1970-01-02T"+(new Date().toLocaleString("en-us", { hour: "numeric", minute: "numeric", second:"numeric", hour12: false }))).tz(timezone)
        let diff = nextChange.diff(now, "seconds")
        if (diff > 0) diff += 86400 //! not really needed, but eh *shrug*, cant afford for it to break, so better safe than sorry
        diffs.push(diff)
    }
    let diffsCopy = diffs.filter((x) => x <= 0)
    let minDiff = diffs.indexOf(Math.max(...diffsCopy))
    if (minDiff == -1) {
        minDiff = diffs.indexOf(Math.max(...diffs))
    }
    let shouldCurrentlyFollow = times[minDiff]
    return shouldCurrentlyFollow
}