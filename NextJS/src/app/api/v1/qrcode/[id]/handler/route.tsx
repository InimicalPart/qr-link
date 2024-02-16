import { NextRequest, NextResponse } from "next/server"
import {QRLinkGlobal} from "@/types/api/v1/global"
import { QRCodeData } from "@/types/api/v1/QRCode"
import moment from "moment-timezone"
import { generateTrackingCode, getPassedTime } from "@/utilities/api/v1/misc"
import { saveQR } from "@/utilities/api/v1/database"

declare const global: QRLinkGlobal

export async function GET(request: NextRequest, {params}:{params:{id:string}}): Promise<NextResponse> {
    const { id } = params
    // Make sure request is fresh
    if (!request.nextUrl.searchParams.get("_")) {
      let nowFlipped = new Date().getTime().toString().split("").reverse().join("") // This is to confuse potential attackers that might try to add fake scans
      return NextResponse.redirect(new URL("/qrcode/" + id + "/handler?_=" + Buffer.from(nowFlipped).toString("base64"),request.url)) // By doing this, /qrcode/:id/handler will not show up in the user's history, preventing them from going back to the QR-code after it has been scanned which also prevents a fake scan count
    } else {
      const then = new Date(parseInt(Buffer.from(request.nextUrl.searchParams.get("_") as string, "base64").toString("utf-8").split("").reverse().join("")))
      const now = new Date().getTime()
      if (now - then.getTime() > 2000 || then.getTime() - now > 0) { 
        return new NextResponse(JSON.stringify({error: "INVALID", message: "This request is invalid."}), {status: 400})
      }
    }
    if (!Object.keys(global.QRCodeTable).includes(id)) {
      return new NextResponse(JSON.stringify({
        error: "INVALID_ID",
        message: "Invalid ID provided.",
      }), { status: 400 });
    }
    console.log("[QRCode] QR-code was scanned: " + id);
    const { type, data } = global.QRCodeTable[id];
    let currentAction: Partial<QRCodeData> = {}
    if (data.schedule) {
      let day = moment().tz(data.schedule.timezone ?? moment.tz.guess()).format("dddd").toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
      let time = getPassedTime(Object.keys(data.schedule[day]), data.schedule.timezone ?? moment.tz.guess())
      if (!time) {
          let currentDay = moment().tz(data.schedule.timezone ?? moment.tz.guess())
          // go back a day and try again
          let maxiumumDaysToGoBack = 7
          while (!time) {
              currentDay.subtract(1, "days")
              day = currentDay.format("dddd").toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
              time = getPassedTime(Object.keys(data.schedule[day] as any), data.schedule.timezone ?? moment.tz.guess())
  
              maxiumumDaysToGoBack--
              if (maxiumumDaysToGoBack == 0) {
                  console.log("[QRCode] No valid schedule found for QR-code " + id + "!!")
                return new NextResponse(`
                      <html>
                          <head>
                              <title>QRLink</title>
                          </head>
                          <body>
                              <p>This QR-code has an invalid schedule, please check back later.</p>
                          </body>
                      </html>
                      `, {status: 500})
              }
          }
      } 
      currentAction = data.schedule[day][time]
    } else {
      currentAction = data;
    }
    if (!global.QRCodeTable[id].settings.getScanData) {
        global.QRCodeTable[id].scanCount++; //! Only add to scanCount if we are not getting scan data
        saveQR(id, global.QRCodeTable[id], true)
    }
    if (global.QRCodeTable[id].expires) {
      if (new Date() > new Date(global.QRCodeTable[id].expires as Date)) {
        if (currentAction.after_expiry) {
          console.log("[QRCode] QR-code has expired, redirecting to: " + currentAction.after_expiry);
          return NextResponse.redirect(currentAction.after_expiry);
        }
          return new NextResponse(`
            <html>
                <head>
                    <title>QRLink</title>
                </head>
                <body>
                    <p>This QR-code has expired.</p>
                </body>
            </html>
          `, {status: 400})
      }
    }
  
    switch (type) {
      case "redirect":
        if (!currentAction.redirect_to) {
          return new NextResponse(JSON.stringify({
            error: "NO_REDIRECT",
            message: "No redirect URL provided.",
          }), { status: 500 });
        }
        if (global.QRCodeTable[id].settings.getScanData) {
          // if only timestamp or user-agent is requested, we can get it using express and redirect them normally
          if (Object.keys(global.QRCodeTable[id].settings.scanData).filter((key) => !["timestamp", "user-agent"].includes(key) && global.QRCodeTable[id].settings.scanData[key as "timestamp"|"user-agent"|"fingerprint"|"ip"|"location"]).length == 0) {
  
            let finalScanData: Partial<{
                fingerprint: string,
                "user-agent": string,
                timestamp: Date,
                ip: string,
                location: {
                    latitude: number,
                    longitude: number,
                    accuracy: number
                }
            }> = {}
            if (global.QRCodeTable[id].settings.scanData.timestamp) {
                finalScanData.timestamp = new Date()
            }
            if (global.QRCodeTable[id].settings.scanData["user-agent"]) {
                finalScanData["user-agent"] = request.headers.get("user-agent")
            }
  
            global.QRCodeTable[id].scanData.push(finalScanData)
            global.QRCodeTable[id].scanCount++
            saveQR(id, global.QRCodeTable[id], true)
            if (!(currentAction.redirect_to.toLowerCase().startsWith("begin:vcard") && currentAction.redirect_to.toLowerCase().endsWith("end:vcard"))){
              console.log("[QRCode] Redirecting to: " + currentAction.redirect_to);
              return NextResponse.redirect(currentAction.redirect_to);
            } 
          }
        if (currentAction.redirect_to.toLowerCase().startsWith("begin:vcard") && currentAction.redirect_to.toLowerCase().endsWith("end:vcard")){
              console.log("[QRCode] Redirecting to vCard: " + currentAction.redirect_to.replace(/\n/g,"%0A"));
              return new NextResponse(
                  `
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta http-equiv="refresh" content="0;url=data:text/vcard;charset=utf-8,${currentAction.redirect_to.replace(/\n/g,"%0A")}">
                      <title>Redirecting...</title>
                  </head>
                  <body>
                      <p>If you are not redirected, <a download="vcard_${new Date().getTime()}.vcf" href="data:text/vcard;charset=utf-8,${currentAction.redirect_to.replace(/\n/g,"%0A")}">click here</a>.</p>
                  </body>
                  </html>
                  `, {status: 200})
          }
  
              const {body, javascript} = await generateTrackingCode(id, {
                  serverURL: global.serverURL,
                  port: global.port,
                  currentAction,
                  request: request
                  
              })
  
              return new NextResponse(`
              <!DOCTYPE html>
              <html lang="en">
              <head>
                  <title>QRLink</title>
              </head>
              <body>
                  <p>Redirecting...</p>
                  ${body}
                  <script>${javascript}</script>
              </body>
              </body>
              </html>
              `, {status: 200})
      } else {
        console.log("[QRCode] Redirecting to: " + currentAction.redirect_to);
        return NextResponse.redirect(currentAction.redirect_to);
      }
      default:
        return new NextResponse(JSON.stringify({
          error: "INVALID_TYPE",
          message: "Invalid type.",
        }), {status: 500})
    }
  
}