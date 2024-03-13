import crypto from "crypto";
import { QRCode, Types } from "./qrcode";
import { resolveID } from "./authentication";
import QRCodeGenerator from "qrcode";
import path from "path";
import moment from "moment-timezone";
import { QRLinkGlobal } from "@/types/api/v1/global";
import { getPage } from "./PDF";
declare const global: QRLinkGlobal


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



export async function QRCode2PDF(qrcode: QRCode, id: string) {
    function settings2HTML(settings: { getScanData: boolean; scanData: {information:{
        fingerprint:boolean;
        "user-agent":boolean;
        ip:boolean;
        location:boolean;
    }; sendToURL:boolean; JWTEncryptionKey:string;
    }; requirements: {location:boolean; "user-agent":boolean;}}) {
        let rtrn = []
        let template = `<span>[TXT]</span>`

        rtrn.push(template.replace("[TXT]", "Get scan data -> " + (settings.getScanData ? "YES" : "NO")))
        if (settings.getScanData) {
            rtrn.push(template.replace("[TXT]", "Get Device Fingerprint -> " + (settings.scanData.information.fingerprint ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get User-Agent -> " + (settings.scanData.information["user-agent"] ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get IP -> " + (settings.scanData.information.ip ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Get Location -> " + (settings.scanData.information.location ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Require Location -> " + (settings.requirements.location ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Require User-Agent -> " + (settings.scanData.information["user-agent"] ? "YES" : "NO")))
            rtrn.push(template.replace("[TXT]", "Send to Redirect URL -> " + (settings.scanData.sendToURL ? "YES" : "NO")))
            if (settings.scanData.sendToURL) {
                rtrn.push(template.replace("[TXT]", "JWT Encryption Key -> " + settings.scanData.JWTEncryptionKey))
            }
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


    


const qrCodeHTML = `<div style="font-family: 'Inter', sans-serif;min-height:100%;position:absolute;min-width: 100%;top: 0;left: 0;">
<img alt="QR Code" loading="eager" width="250" height="250" decoding="async" data-nimg="1" style="color:transparent;position:relative;left:50%;top:50px;transform:translateX(-50%)" src="${await QRCodeGenerator.toDataURL(process.env.API_URL  + "/qrcode/" + id + "/handler",{ errorCorrectionLevel: "H" })}"/>
<hr style="position:relative;left:50%;transform:translateX(-50%);top:70px;width:80%;height:4px;background:#000000;border-radius:8px;"/>
<div id="title" style="position: relative;left:50%;top: 80px;transform:translateX(-50%);width:60%;height:auto;text-align:center">
    <h1 id="name" style="font-size:30px;font-weight:900">QRLink</h1>
    <p id="id" style="font-size:16px;font-weight:500;color:#929292;bottom: 5px;position:relative">[${id}]</p>
</div>
<hr style="position:relative;left:50%;transform:translateX(-50%);top: 85px;width:50%;height:3px;background:#c1c1c1;border-radius:8px;">
<div id="information" style="position: relative;left:50%;top: 100px;transform:translateX(-50%);width:60%;height:auto;text-align:center; font-weight:400;">
    <p style="margin:0px 0px 5px 0px;max-width:500px;text-align:center;position:relative;left:50%;transform:translateX(-50%);overflow-wrap:break-word" id="qr-id-cntr">ID:<br><b>
        <span id="qr-id">${id}</span>
    </b></p>
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
</div>`
    //* Generate PDF using puppeteer
    //! First one is gonna be slow while it's launching the browser and loading all styles, during testing, the first one took 3093ms (compilation time included), the second one took ~40-60ms
    //! 3 seconds without the compilation time isn't that noticeable, and since it's only on the first one, we can leave it as is
    const page = await getPage();
    await page.evaluate((qrCodeHTML)=>{
        document.body.innerHTML = qrCodeHTML
    },qrCodeHTML)

    await page.waitForSelector("body > div > img");

    console.log("[-QR-] Generating...")
    const pdf = await page.pdf({ path: path.join(__dirname, "..","qrcode_"+id+".pdf"), format: "A4", printBackground: true, scale: 0.87, pageRanges: "1"});
    console.log("[-QR-] Generated PDF for QR-code " + id);
    return "data:application/pdf;base64," + pdf.toString("base64");
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

