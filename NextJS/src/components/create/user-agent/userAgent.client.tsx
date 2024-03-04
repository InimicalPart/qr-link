"use client";

import { useState } from "react";
import UserAgentList from "./userAgentList.client";

export default function UserAgent({
    state,
    qrCodeInfo = {},
    action
}: {
        state: any,
        qrCodeInfo?: any
        action: string
}) {

    const [browser, setBrowser] = useState("any")
    const [device, setDevice] = useState(null)
    const [currentUserAgentList, setCurrentUserAgentList] = useState<{
        browser: string,
        browser_name?: string
        device: string,
        device_name?: string
        redirect_to: string,
        after_expiry?: string
    }[]>([])

    function validateRegex(pattern: string) {
        try {
            const m = pattern.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
            return m ? !!new RegExp(m[2],m[3])
                : false;
          } catch (e) {
            return false
          }
    }

    return (
        <>
        {/* <input className="create" type="hidden" disabled={action !== "schedule"} id="scheduleCompacted" name="schedule" value={JSON.stringify(currentScheduleActions)}/> */}
 <div id="currentActions">
     <UserAgentList currentUserAgentList={currentUserAgentList} setCurrentUserAgentList={setCurrentUserAgentList}/>
     <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
     fontSize: "9pt",
     color: "red",
     display: state?.schedule ? "block" : "none",
     marginBottom: 10,
     }}>{state?.schedule}</p>
 </div>
 <div id="newAction" style={{
     border: "1px solid black",
     paddingBottom: 10,
     paddingTop: 10,
     borderRadius: 8,
     width:350,
     position: "relative",
     left: "50%",
     transform: "translateX(-50%)"
 }}>
     {/* Allow the user to specify a week day (Monday, Tuesday, ...), and a time in HH:MM:SS format (use <input className="create">) or "All day", then allow the user to specify actions like redirect_to and after_expiry */}
     <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Browser</b></p>
     <select
     id="browser"
     className="create disabled:bg-neutral-400"
     style={{
         border: "1px black solid",
         borderRadius: 8,
         width:250,
         paddingLeft:5
     }}
     onChange={(e) => {
        setBrowser((document.getElementById("browser") as HTMLSelectElement).value)
        const newVal = e.target.value

        if (newVal == "safari") {
            setDevice("iphone")
            if (!["iphone","mac"].includes((document.getElementById("device") as HTMLSelectElement).value)) {
                Array.from(document.getElementById("device")?.children).forEach((a: any) => {a.selected = a.value == "iphone"})
            }
        } else if (newVal == "samsungInternet") {
            setDevice("android")
            if ((document.getElementById("device") as HTMLSelectElement).value != "android") {
                Array.from(document.getElementById("device")?.children).forEach((a: any) => {a.selected = a.value == "android"})
            }
        } else if (newVal == "any") {
            setDevice(null)
            if ((document.getElementById("device") as HTMLSelectElement).value == "any") {
                Array.from(document.getElementById("device")?.children).forEach((a: any) => {a.selected = a.value == ""})
            }
        } 
    }}
     >
     <option className="create" value="any">Any</option> 
     <option className="create" value="safari">Safari</option>
     <option className="create" value="chrome">Chrome</option>
     <option className="create" value="firefox">Firefox</option>
     <option className="create" value="opera">Opera</option>"iphone"
     <option className="create" value="edge">Edge</option>
     <option className="create" value="samsungInternet">Samsung Internet</option>
     <option className="create" value="custom">Custom (Advanced)</option>
     </select>



     <div hidden={browser !== "custom"}>
        <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10, fontSize:13}}><b>User-Agent Pattern</b></p>
        <input className="create" id="browserPattern" style={{
            width: 250,
            border: state?.userAgentPattern ? "1px red solid" : '1px black solid',
            borderRadius: 8,
            textAlign: 'center'
        }} type="text" maxLength={50}/>

        <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10, fontSize:13}}><b>Pattern name</b> <span style={{
                fontSize: '8pt',
                flexBasis: '100%',
                marginTop: -5
    }}>(optional)</span></p>
        <input className="create" id="browserPatternName" style={{
            width: 250,
            border: state?.userAgentName ? "1px red solid" : '1px black solid',
            borderRadius: 8,
            textAlign: 'center'
        }} type="text" maxLength={20} defaultValue={"B-Pattern " + (currentUserAgentList.length+1)}/>

     </div>

    <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10}}><b>Device</b></p>

    <select
        id="device"
        className="create disabled:bg-neutral-400"
        style={{
            border: "1px black solid",
            borderRadius: 8,
            width:250,
            paddingLeft:5
        }}
        defaultValue={browser == "samsungInternet" ? "android": browser == "safari" ? "iphone" : browser == "any" ? "" : (device ?? "")}
        disabled={browser == "samsungInternet" ? true : false}
     onChange={() => setDevice((document.getElementById("device") as HTMLSelectElement).value)}
     >
        <option className="create" disabled value="">-- Please choose an option --</option>
        <option className="create" disabled={browser == "any"} value="any">Any</option>
        <option className="create" disabled={browser == "safari"} value="android">Android</option>
        <option className="create" value="iphone">iPhone</option>
        <option className="create" disabled={browser == "safari"} value="windows">Windows</option>
        <option className="create" value="mac">Mac</option>
        <option className="create" disabled={browser == "safari"} value="linux">Linux</option>
        <option className="create" value="other">Other</option>
    </select>

    <div hidden={device !== "other"}>
        <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10, fontSize:13}}><b>User-Agent Pattern</b></p>
        <input className="create" id="devicePattern" style={{
            width: 250,
            border: state?.userAgentPattern ? "1px red solid" : '1px black solid',
            borderRadius: 8,
            textAlign: 'center'
        }} type="text" maxLength={50} />

    <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10, fontSize:13}}><b>Pattern name</b>  <span style={{
                fontSize: '8pt',
                flexBasis: '100%',
                marginTop: -5
    }}>(optional)</span></p>
        <input className="create" id="devicePatternName" style={{
            width: 250,
            border: state?.userAgentName ? "1px red solid" : '1px black solid',
            borderRadius: 8,
            textAlign: 'center'
        }} type="text" maxLength={20} defaultValue={"D-Pattern " + (currentUserAgentList.length+1)}/>
     </div>


     <br/>
     <br/>
     {/* show both actions at the same time */}
     <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Redirect to</b></p>
     <textarea
     id="uaRedirect"
     className="disabled:bg-neutral-400"
     placeholder="URL / VCard / ..."
     autoCapitalize="none"
     autoCorrect="none"
     spellCheck="false"
     style={{
         border: "1px black solid",
         borderRadius: 8,
         textAlign: "center",
         maxHeight: 250,
         minHeight: 30,
         height: 30,
         width:250
     }}
     ></textarea>
     <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10}} title="Where to navigate once the QR-code has expired"><b>After Expiry</b> <span style={{
             fontSize: '8pt',
             flexBasis: '100%',
             marginTop: -5
         }}>(optional)</span></p>
     <textarea
     id="uaAERedirect"
     className="disabled:bg-neutral-400"
     placeholder="URL / VCard / ..."
     autoCapitalize="none"
     autoCorrect="none"
     spellCheck="false"
     style={{
         border: "1px black solid",
         borderRadius: 8,
         textAlign: "center",
         maxHeight: 250,
         minHeight: 30,
         height: 30,
         width:250
     }}
     ></textarea>
     <br/>
     <br/>
     <button className="create"
     type="button"
     onClick={() => {
        let copy = JSON.parse(JSON.stringify(currentUserAgentList));
        

        
        const chosenBrowser = (document.getElementById("browser") as HTMLSelectElement).value;
        const chosenDevice = (document.getElementById("device") as HTMLSelectElement).value;

        if (chosenBrowser == "custom") {
            const pattern = (document.getElementById("browserPattern") as HTMLInputElement).value;

            if (!pattern) {
                alert("Browser pattern is required");
                return;
            }

            if (pattern.length > 50) {
                alert("Browser pattern is too long (max 50 characters)")
                return;
            }

            if (!validateRegex(pattern)) {
                alert("Browser pattern is not a valid regex");
                return;
            }


            const patternName = (document.getElementById("browserPatternName") as HTMLInputElement).value;

            if (!patternName) {
                alert("Pattern name is required");
                return;
            }

            if (patternName.length > 20) {
                alert("Pattern name is too long (max 20 characters)")
                return;
            }

            if (copy.filter((a: { browser_name: string; }) => a.browser_name == patternName).length != 0) {
                alert("Pattern name already exists");
                return;
            }

        }
        if (chosenDevice == "other") {
            const pattern = (document.getElementById("devicePattern") as HTMLInputElement).value;

            if (!pattern) {
                alert("Device pattern is required");
                return;
            }

            if (pattern.length > 50) {
                alert("Device pattern is too long (max 50 characters)")
                return;
            }

            if (!validateRegex(pattern)) {
                alert("Device pattern is not a valid regex");
                return;
            }

            const patternName = (document.getElementById("devicePatternName") as HTMLInputElement).value;

            if (!patternName) {
                alert("Pattern name is required");
                return;
            }

            if (patternName.length > 20) {
                alert("Pattern name is too long (max 20 characters)")
                return;
            }

            if (copy.filter((a: { device_name: string; }) => a.device_name == patternName).length != 0) {
                alert("Pattern name already exists");
                return;
            }

        }

        let redirect_to = (document.getElementById("uaRedirect") as HTMLTextAreaElement).value;
        let after_expiry = (document.getElementById("uaAERedirect") as HTMLTextAreaElement).value;

        if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(redirect_to)) {
            alert("Redirect to must be a valid URL or VCard");
            return;
        }

        if (after_expiry.length != 0 && !/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(after_expiry)) {
            alert("After Expiry must be a valid URL or VCard");
            return;
        }

        copy.push({
            browser: chosenBrowser,
            browser_is_regex: chosenBrowser == "custom",
            browser_name: chosenBrowser == "custom" ? (document.getElementById("browserPatternName") as HTMLInputElement).value : chosenBrowser[0].toUpperCase() + chosenBrowser.slice(1),
            device: chosenDevice,
            device_is_regex: chosenDevice == "other",
            device_name: chosenDevice == "other" ? (document.getElementById("devicePatternName") as HTMLInputElement).value : chosenDevice[0].toUpperCase() + chosenDevice.slice(1),
            redirect_to,
            after_expiry: after_expiry == "" ? undefined : after_expiry
        });

        setCurrentUserAgentList(copy);
        window.dispatchEvent(new Event('refreshUserAgentList'));
            
     }}
     style={{
         border: '1px black solid',
         height: 30,
         borderRadius: 8,
         background: '#ddd'
     }}>
        Add
     </button>
 </div>
</>

    )
}