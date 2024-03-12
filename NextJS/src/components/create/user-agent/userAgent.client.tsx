"use client";

import { useState } from "react";
import UserAgentList from "./userAgentList.client";
import Swal from "sweetalert2-ql";
import "@sweetalert2/theme-dark"

const browserRegexMap = {
    "opera": /(?:Opera|OPR)\/([0-9]+\.[0-9]+)/,
    "chrome": /(?:Chrome|CriOS)\/([0-9]+\.[0-9]+)/,
    "firefox": /(?:Firefox)\/([0-9]+\.[0-9]+)/,
    "edge": /(?:Edge)\/([0-9]+\.[0-9]+)/,
    "safari": /(?:Safari)\/([0-9]+\.[0-9]+)/,
    "samsungInternet": /(?:SamsungBrowser)\/([0-9]+\.[0-9]+)/,
    "ie": /(?:Trident)\/([0-9]+\.[0-9]+)/,
    "any": /.*/
}

const osRegexMap = {
    "apple": /(?:Macintosh|Mac OS X)/,
    "android": /(?:Android|Android [0-9]+\.[0-9]+)/,
    "windows": /(?:Windows|Win[0-9]+)/,
    "linux": /(?:Linux|X11)/,
    "any": /.*/
}
function showError(text: string, time: number = 3000) {
    Swal.mixin({
        toast: true,
        position: 'bottom',
        showConfirmButton: false,
        timer: time,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    }).fire({
        icon: 'error',
        animation: true,
        title: text
    })
}
function makePretty(data: any, type: any) {

    if (type == "browser") {
        switch (data) {
            case "samsungInternet":
                data = "Samsung Internet";
                break;
            case "any":
                data = "Any Browser";
                break;
            default:
                data = data[0].toUpperCase() + data.slice(1);
                break;
        }
    } else {
        switch (data) {
            case "any":
                data = "Any OS";
                break;
            default:
                data = data[0].toUpperCase() + data.slice(1);
                break;
        }
    }
    return data;
}

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
    const [os, setOS] = useState("any")
    const [currentUserAgentList, setCurrentUserAgentList] = useState<{
        browser: string,
        browser_is_regex?: boolean,
        browser_name?: string,

        os: string,
        os_is_regex?: boolean,
        os_name?: string,
        
        redirect_to: string,
        after_expiry?: string
    }[]>(convertFromServerFormat(qrCodeInfo?.data?.userAgents ?? []))


    function convertToServerFormat(list: typeof currentUserAgentList): {
        browser: string, // regex
        browser_name: string, // regex
        os: string, // regex
        os_name: string, // regex
        redirect_to: string,
        after_expiry?: string
    }[] {
        return list.map((a) => {
            return {
                browser: a.browser_is_regex ? a.browser : browserRegexMap[a.browser as "any" | "safari" | "chrome" | "firefox" | "opera" | "edge" | "samsungInternet"].toString(),
                browser_name: a.browser_name,
                os: a.os_is_regex ? a.os : osRegexMap[a.os as "any" | "apple" | "android" | "windows" | "linux"].toString(),
                os_name: a.os_name,
                redirect_to: a.redirect_to,
                after_expiry: a.after_expiry
            }
        })
    }

    function convertFromServerFormat(list: {
        browser: string, // regex
        browser_name: string,
        os: string, // regex
        os_name: string, 
        redirect_to: string,
        after_expiry?: string
    }[]): {
        browser: string,
        browser_is_regex?: boolean,
        browser_name?: string,
        browser_name_pretty?: string,

        os: string,
        os_is_regex?: boolean,
        os_name?: string,
        os_name_pretty?: string,
        
        redirect_to: string,
        after_expiry?: string
    }[] {
        return list.map((a) => {
            let browser = Object.keys(browserRegexMap).find((b) => browserRegexMap[b as "any" | "safari" | "chrome" | "firefox" | "opera" | "edge" | "samsungInternet"].toString() == a.browser);
            let os = Object.keys(osRegexMap).find((b) => osRegexMap[b as "any" | "apple" | "android" | "windows" | "linux"].toString() == a.os);
            return {
                browser: browser ?? a.browser,
                browser_is_regex: !browser,
                browser_name: a.browser_name,
                browser_name_pretty: makePretty(a.browser_name,"browser"),
                os: os ?? a.os,
                os_is_regex: !os,
                os_name: a.os_name,
                os_name_pretty: makePretty(a.os_name,"os"),
                redirect_to: a.redirect_to,
                after_expiry: a.after_expiry
            }
        })
    }

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
        <input className="create" type="hidden" disabled={action !== "user-agent"} id="userAgentCompacted" name="userAgents" value={JSON.stringify(convertToServerFormat(currentUserAgentList))}/>
 <div id="currentActions">
     <UserAgentList currentUserAgentList={currentUserAgentList} setCurrentUserAgentList={setCurrentUserAgentList}/>
     <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
     fontSize: "9pt",
     color: "red",
     display: state?.userAgents ? "block" : "none",
     marginBottom: 10,
     }}>{state?.userAgents}</p>
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
         const selectedBrowser = (document.getElementById("browser") as HTMLSelectElement).value;
        setBrowser(selectedBrowser)
        // make sure so that if the user selects for example safari, and the os isnt "any", "apple" or "custom", it gets set to "apple"
        if (selectedBrowser == "safari") {
            if (["apple","custom"].includes(os)) {
                return;
            }
            setOS("apple");
            Array.from((document.getElementById("os") as HTMLSelectElement).children).forEach((a: any) => {
                if (a.value == "apple") {
                    a.selected = true;
                }
            })
        } else if (selectedBrowser == "edge") {
            if (["windows","custom"].includes(os)) {
                return;
            }
            setOS("windows");
            Array.from((document.getElementById("os") as HTMLSelectElement).children).forEach((a: any) => {
                if (a.value == "windows") {
                    a.selected = true;
                }
            })
        } else if (selectedBrowser == "samsungInternet") {
            if (["android","custom"].includes(os)) {
                return;
            }
            setOS("android");
            Array.from((document.getElementById("os") as HTMLSelectElement).children).forEach((a: any) => {
                if (a.value == "android") {
                    a.selected = true;
                }
            })
        }


    }}
     >
     <option className="create" value="any">Any</option> 
     <option className="create" value="safari">Safari</option>
     <option className="create" value="chrome">Chrome</option>
     <option className="create" value="firefox">Firefox</option>
     <option className="create" value="opera">Opera</option>
     <option className="create" value="edge">Edge</option>
     <option className="create" value="samsungInternet">Samsung Internet</option>
     <option className="create" value="custom">Custom (Advanced)</option>
     </select>



     <div hidden={browser !== "custom"}>
        <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10, fontSize:13}}><b>User-Agent RegEx</b></p>
        <input className="create" id="browserPattern" style={{
            width: 250,
            border: '1px black solid',
            borderRadius: 8,
            textAlign: 'center'
        }} type="text" maxLength={50}/>

        <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10, fontSize:13}}><b>Pattern name</b></p>
        <input className="create" id="browserPatternName" style={{
            width: 250,
            border: '1px black solid',
            borderRadius: 8,
            textAlign: 'center'
        }} type="text" maxLength={20} defaultValue={"B-Pattern " + (currentUserAgentList.length+1)}/>

     </div>

    <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10}}><b>OS</b></p>

    <select
        id="os"
        className="create disabled:bg-neutral-400"
        style={{
            border: "1px black solid",
            borderRadius: 8,
            width:250,
            paddingLeft:5
        }}
        defaultValue={os}
        onChange={() => setOS((document.getElementById("os") as HTMLSelectElement).value)}
     >
        <option className="create" hidden value="">-- Please choose an option --</option>
        <option className="create" hidden={["safari","edge","samsungInternet"].includes(browser)} value="any">Any</option>
        <option className="create" hidden={["edge","samsungInternet"].includes(browser)} value="apple">Apple</option>
        <option className="create" hidden={["safari","edge"].includes(browser)} value="android">Android</option>
        <option className="create" hidden={["safari","samsungInternet"].includes(browser)} value="windows">Windows</option>
        <option className="create" hidden={["safari","samsungInternet","edge"].includes(browser)} value="linux">Linux</option>
        <option className="create" value="custom">Custom (Advanced)</option>
    </select>

    <div hidden={os !== "custom"}>
        <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10, fontSize:13}}><b>User-Agent RegEx</b></p>
        <input className="create" id="osPattern" style={{
            width: 250,
            border: '1px black solid',
            borderRadius: 8,
            textAlign: 'center'
        }} type="text" maxLength={50} />

    <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10, fontSize:13}}><b>Pattern name</b></p>
        <input className="create" id="osPatternName" style={{
            width: 250,
            border: '1px black solid',
            borderRadius: 8,
            textAlign: 'center'
        }} type="text" maxLength={20} defaultValue={"OS-Pattern " + (currentUserAgentList.length+1)}/>
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
     <div style={{
            width: "100%",
            fontSize: "9pt",
            textAlign: "center",
            color: "red",
            fontWeight: 600,
            paddingRight: "20px",
            paddingLeft: "20px",
            marginBottom: "20px",
        }}>
            <p style={{textAlign: "center"}}>
                Be careful to not set these values to one that cannot exist or one that collides with your previous choices. Doing so may lead to unexpected behavior.
            </p>
        </div>
     <button className="create" type="button" onClick={() => {
        let copy = JSON.parse(JSON.stringify(currentUserAgentList));
        

        
        let chosenBrowser = (document.getElementById("browser") as HTMLSelectElement).value;
        let chosenOS = (document.getElementById("os") as HTMLSelectElement).value;

        if (chosenBrowser === "") {
            showError("Please select a browser");
            return;
        }
        if (chosenOS === "") {
            showError("Please select an os");
            return;
        }

        if (browser === "custom" && !validateRegex((document.getElementById("browserPattern") as HTMLInputElement).value)) {
            showError("Browser pattern must be a valid regex");
            return;
        }

        if (os === "custom" && !validateRegex((document.getElementById("osPattern") as HTMLInputElement).value)) {
            showError("OS pattern must be a valid regex");
            return;
        }

        // if it already exists, or there is an "any" for os with the same browser, then return
        if (copy.some((a: any) => a.browser == chosenBrowser && (a.os == chosenOS || a.os == "any"))) {

            let confirmationMessage = ""

            if (copy.some((a: any) => a.browser == chosenBrowser && a.os == "any")) {
                confirmationMessage = "A user-agent with the same browser and any OS already exists. Do you want to overwrite it?";
            } else {
                confirmationMessage = "A user-agent with the same browser and OS already exists. Do you want to overwrite it?";
            }

            if (!confirm(confirmationMessage)) {
                return;
            }

            copy = copy.filter((a: any) => a.browser != chosenBrowser || (a.os != chosenOS && a.os != "any"));
        }



        let redirect_to = (document.getElementById("uaRedirect") as HTMLTextAreaElement).value;
        let after_expiry = (document.getElementById("uaAERedirect") as HTMLTextAreaElement).value;

        if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(redirect_to)) {
            showError("Redirect to must be a valid URL or VCard");
            return;
        }

        if (after_expiry.length != 0 && !/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(after_expiry)) {
            showError("After Expiry must be a valid URL or VCard");
            return;
        }


        let prettifiedBrowserName = makePretty(chosenBrowser == "custom" ? (document.getElementById("browserPatternName") as HTMLInputElement).value : chosenBrowser,"browser");
        let prettifiedOSName = makePretty(chosenOS == "custom" ? (document.getElementById("osPatternName") as HTMLInputElement).value : chosenOS,"os");

        



        
        copy.push({
            browser: chosenBrowser,
            browser_is_regex: chosenBrowser == "custom",
            browser_name: chosenBrowser == "custom" ? (document.getElementById("browserPatternName") as HTMLInputElement).value : chosenBrowser,
            browser_name_pretty: prettifiedBrowserName,
            
            os: chosenOS,
            os_is_regex: chosenOS == "custom",
            os_name: chosenOS == "custom" ? (document.getElementById("osPatternName") as HTMLInputElement).value : chosenOS, 
            os_name_pretty: prettifiedOSName,
            
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