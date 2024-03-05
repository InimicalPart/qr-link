"use client";

import { useEffect, useState } from "react";
import Location from "./location/location.client";
import UserAgent from "./user-agent/userAgent.client";
import Redirect from "./redirect/redirect.client";
import Schedule from "./schedule/schedule.client";



export default function Actions({
    state,
    qrCodeInfo = {}
}:{
    state:any,
    qrCodeInfo?: any
}) {
    let [action, setAction] = useState(qrCodeInfo.type ?? "");


    useEffect(() => {
        console.log("Action changed", (document.getElementById("qr-action") as HTMLSelectElement).value)
        setAction((document.getElementById("qr-action") as HTMLSelectElement).value)
        if (action === "redirect") {
            document.getElementById("redirectContainer").style.display = "block"
            document.getElementById("scheduleContainer").style.display = "none"
            document.getElementById("locationContainer").style.display = "none"
            document.getElementById("userAgentContainer").style.display = "none"
        } else if (action === "schedule") {
            document.getElementById("redirectContainer").style.display = "none"
            document.getElementById("scheduleContainer").style.display = "block"
            document.getElementById("locationContainer").style.display = "none"
            document.getElementById("userAgentContainer").style.display = "none"
        } else if (action === "location") {
            document.getElementById("redirectContainer").style.display = "none"
            document.getElementById("scheduleContainer").style.display = "none"
            document.getElementById("locationContainer").style.display = "block"
            document.getElementById("userAgentContainer").style.display = "none"
        } else if (action === "user-agent") {
            document.getElementById("redirectContainer").style.display = "none"
            document.getElementById("scheduleContainer").style.display = "none"
            document.getElementById("locationContainer").style.display = "none"
            document.getElementById("userAgentContainer").style.display = "block"
        } else {
            document.getElementById("redirectContainer").style.display = "none"
            document.getElementById("scheduleContainer").style.display = "none"
            document.getElementById("locationContainer").style.display = "none"
            document.getElementById("userAgentContainer").style.display = "none"
        }
    }, [action]);


    return (
      <>
        <div id="qr-actiontype-cntr" className="QRL-container">
            <p className="qr-info-label flex justify-center items-center flex-wrap">
                <b>Action:</b>
            </p>
            <select
                id="qr-action"
                onChange={()=>setAction((document.getElementById("qr-action") as HTMLSelectElement).value)}
                className="create disabled:bg-neutral-400"
                style={{
                border: state?.type ? "1px red solid" : "1px black solid",	
                color: state?.type ? "red" : "black",
                borderRadius: 8,
                textAlign: "center",
                width: 300,
                }}
                defaultValue={qrCodeInfo.type ?? ""}
                name="type"
            >
                <option className="create" value="">
                --Please choose an option--
                </option>
                <option className="create" value="redirect">Redirect</option>
                <option className="create" value="schedule">Schedule</option>
                <option className="create" value="location">Location</option>
                <option className="create" value="user-agent">User-Agent</option>
            </select>
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                    fontSize: "9pt",
                    color: "red",
                    display: state?.type ? "block" : "none",
                }}>{state?.type}</p>
            <div id="actionContainer" style={{
                marginTop: 20,
            }}>
                <div id="redirectContainer" style={{ display: "none" }}>
                    <Redirect state={state} qrCodeInfo={qrCodeInfo} action={action}/>
                </div>
                <div id="scheduleContainer" style={{ display: "none" }}>
                    <Schedule state={state} qrCodeInfo={qrCodeInfo} action={action}/>
                </div>
                <div id="locationContainer" style={{ display: "none" }}>
                    <Location state={state} qrCodeInfo={qrCodeInfo} action={action}/>
                </div>
                <div id="userAgentContainer" style={{ display: "none" }}>
                    <UserAgent state={state} qrCodeInfo={qrCodeInfo} action={action}/>
                </div>
            </div>
        </div>
      </>
    );
}