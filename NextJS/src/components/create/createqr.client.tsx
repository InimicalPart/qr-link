"use client";

import { useEffect,useState } from "react";

export default function CreateQR({
    token,
    apiURL
}: {
        token: string,
        apiURL: string
}) {
    const [type, setType] = useState("")
    const [buttonDisabled, setButtonDisabled] = useState(true)
    useEffect(() => {
        function onTypeChanged(e: any) {
            setType((e as CustomEvent).detail);
            if ((e as CustomEvent).detail == "") {
                setButtonDisabled(true)
            } else setButtonDisabled(false)            
        }
        window.addEventListener('typeChange', onTypeChanged)



    },[])


    async function validateInputs(type:string, typeData: {
        data: any | {
            [key: string]: {
                [key: string]: {
                    redirect_to: string,
                    after_expiry?: string
                }
            }
        }
    }): Promise<{
        ID: string,
        updateKey: string,
        expires: string | null,
        name: string,
        description: string
    }> {
        return new Promise((resolve, reject) => {
            function displayExpiredWarning() {
                return confirm(
                  "The date you entered is in the past. This QR code will be expired immediately, do you want to continue?"
                );
              }
            let ID = (document.getElementById("qr-id") as HTMLInputElement).value;
            let updateKey = (document.getElementById("qr-updatekey") as HTMLInputElement).value;
            let expires = (document.getElementById("qr-never-expires-checkbox") as HTMLInputElement).checked
                ? null
                : (document.getElementById("qr-expires") as HTMLInputElement).value;
            let name = (document.getElementById("qr-name") as HTMLInputElement).value;
            let description = (document.getElementById("qr-description") as HTMLInputElement).value;
            if (expires) {
              if (new Date(expires) < new Date()) {
                if (!displayExpiredWarning()) {
                  reject(new Error("Cancelled"));
                  return;
                }
              }
              expires = new Date(expires).toISOString().replace(/:[0-9]{2}\.[0-9]{3}Z/,"") // Fixes timezone issue
            }
            if (ID != "" && !/^[a-zA-Z0-9_.-]*$/.test(ID)) {
                reject({
                    message: "ID must contain only alphanumeric characters, underscores, periods, and dashes."
                });
                document.getElementById("qr-id").style.border = "2px solid red";
                document.getElementById("qr-id").focus();
                return;
            }

            if (ID != "" && /^-|-$|^\.|\.$|-{2,99}|\.{2,99}/g.test(ID)) {
                reject({
                    message: "ID cannot start or end with a period or -, and cannot contain two periods or - in a row."
                });
                document.getElementById("qr-id").style.border = "2px solid red";
                document.getElementById("qr-id").focus();
                return;
            }

            if (ID.length > 50) {
                reject({message:"ID must be 50 characters or less."});
                document.getElementById("qr-id").style.border = "2px solid red";
                document.getElementById("qr-id").focus();
                return;
            }

            if (description.length > 200) {
                reject({message:"Description must be 200 characters or less."});
                document.getElementById("qr-description").style.border = "2px solid red";
                document.getElementById("qr-description").focus();
                return;
            }


            if (type == "schedule") {
                if (Object.keys(typeData.data).length === 0) {
                    reject({message:"You must have at least one day specified."});
                    return;
                }
                // if typeData.data[day] is of length 1 or less, reject, if it's allday and has more than 1, reject
                for (let day in typeData.data) {
                    if (day == "timezone") continue;
                    if (Object.keys(typeData.data[day]).length <= 1 && !Object.keys(typeData.data[day]).includes("ALL_DAY")) {
                        reject({message:`${day}: You must have at least one action.`});
                        return;
                    }
                    if (Object.keys(typeData.data[day]).includes("ALL_DAY") && Object.keys(typeData.data[day]).length > 1) {
                        reject({message:`${day}: You cannot have an all day event and other actions at the same time.`});
                        return;
                    }

                    for (let time in typeData.data[day]) {
                            if (typeData.data[day][time].redirect_to == "" || !typeData.data[day][time].redirect_to) {
                                reject({message:`${day}.${time}.redirect_to must be a valid URL or a vCard.`});
                                return;
                            }
                            if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(typeData.data[day][time].redirect_to)) {
                                reject({message:`${day}.${time}.redirect_to must be a valid URL or a vCard.`});
                                return;
                            }

                            if (typeData.data[day][time].after_expiry != "" && typeData.data[day][time].after_expiry) {
                                if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(typeData.data[day][time].after_expiry)) {
                                    reject({message:`${day}.${time}.after_expiry must be a valid URL or a vCard.`});
                                    return;
                                }
                            }
                    }
                }
            } else if (type == "redirect") {
                if (typeData.data.redirect_to == "" || !typeData.data.redirect_to) {
                    reject({message:"'Redirect To' must be a valid URL or a vCard."});
                    return;
                }
                if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(typeData.data.redirect_to)) {
                    reject({message:"'Redirect To' must be a valid URL or a vCard."});
                    return;
                }

                if (typeData.data.after_expiry != "" && typeData.data.after_expiry) {
                    if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(typeData.data.after_expiry)) {
                        reject({message:"'After Expiry' must be a valid URL or a vCard."});
                        return;
                    }
                }
            } else if (type == "location") {
                if (typeData.data.zones.length == 0) {
                    reject({message:"You must have at least one zone."});
                    return;
                }

                for (let zoneIndex in typeData.data.zones) {
                    let zone = typeData.data.zones[zoneIndex]
                    //zone.type has to be either circle or polygon
                    if (zone.type != "circle" && zone.type != "polygon") {
                        reject({message:"Zone "+(zoneIndex+1)+"'s type must be either 'circle' or 'polygon'."});
                        return;
                    }
                    // zone.redirectTo has to be a valid URL or a vCard and cannot be empty
                    if (zone.redirectTo == "" || !zone.redirectTo) {
                        reject({message:"Zone "+(zoneIndex+1)+"'s 'Redirect To' must be a valid URL or a vCard."});
                        return;
                    }
                    if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(zone.redirectTo)) {
                        reject({message:"Zone "+(zoneIndex+1)+"'s 'Redirect To' must be a valid URL or a vCard."});
                        return;
                    }
                    // zone.afterExpiry has to be a valid URL or a vCard, but can be empty
                    if (zone.afterExpiry != "" && zone.afterExpiry) {
                        if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(zone.afterExpiry)) {
                            reject({message:"Zone "+(zoneIndex+1)+"'s 'After Expiry' must be a valid URL or a vCard."});
                            return;
                        }
                    }

                    // if type is circle, zone.radius has to be a number and zone.center has to be an array of 2 numbers
                    if (zone.type == "circle") {
                        if (typeof zone.radius != "number") {
                            reject({message:"Zone "+(zoneIndex+1)+"'s radius must be a number."});
                            return;
                        }
                        if (!Array.isArray(zone.center) || zone.center.length != 2 || typeof zone.center[0] != "number" || typeof zone.center[1] != "number") {
                            reject({message:"Zone "+(zoneIndex+1)+"'s center must be an array of 2 numbers."});
                            return;
                        }
                    }
                    // if type is polygon, zone.positions has to be an array of arrays of 2 numbers
                    else if (zone.type == "polygon") {
                        if (!Array.isArray(zone.positions) || zone.positions.length < 3) {
                            reject({message:"Zone "+(zoneIndex+1)+"'s positions must be an array of at least 3 arrays of 2 numbers."});
                            return;
                        }
                        for (let positionIndex in zone.positions) {
                            let position = zone.positions[positionIndex]
                            if (!Array.isArray(position) || position.length != 2 || typeof position[0] != "number" || typeof position[1] != "number") {
                                reject({message:"Zone "+(zoneIndex+1)+"'s point with index "+positionIndex+" must be an array of 2 numbers."});
                                return;
                            }
                        }
                    }
                }
            }



            resolve({
                ID,
                updateKey,
                expires,
                name,
                description
            })

        })
    }
    function submit() {
        console.log("Submitting")
        function receiveScheduleActions(e: any) {
            let scheduleActions = e.detail ?? {}
            console.log(scheduleActions)
            validateInputs(type, {data:scheduleActions}).then((res)=>{
                fetch(apiURL + "/qrcode", {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    Authorization: token,
                    },
                    body: JSON.stringify({
                    id: res.ID == "" ? undefined : res.ID,
                    update_key: res.updateKey == "" ? undefined : res.updateKey,
                    expires: res.expires,
                    name: res.name,
                    description: res.description,
                    type: "redirect",
                    data: {
                        schedule: scheduleActions
                    },
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                    if (data.error) {
                        alert("An error occurred while linking the QR code: " + data.error + " - " + data.message);
                        (document.getElementById("qr-submit") as HTMLInputElement).disabled = false;
                        document.getElementById("qr-submit").innerHTML = "Create";
                    } else {
                        console.log("ID: " + data.id);
                        console.log("Update key: " + data.update_key);
                        alert(
                        "QR code created successfully!\nID: " +
                            data.id +
                            "\nUpdate key: " +
                            data.update_key
                        );
                        window.location.href = "/dashboard";
                    }
                    });
                }).catch((e)=>{
                    if (e.message) alert(e.message)
                    console.error(e)
                    window.removeEventListener('data', receiveScheduleActions);
                    (document.getElementById("qr-submit") as HTMLInputElement).disabled = false;
                    document.getElementById("qr-submit").innerHTML = "Create";
                })
        }
        function receiveRedirect(e: any) {
            let redirectTo = e?.detail?.redirect_to?.trim()?.replace(/\n/g,"%0A") ?? ""
            let afterExpiry = e?.detail?.after_expiry?.trim()?.replace(/\n/g,"%0A") ?? ""
            validateInputs(type, {data:{
                redirect_to: redirectTo,
                after_expiry: afterExpiry
            }}).then((res)=>{
                fetch(apiURL + "/qrcode", {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    Authorization: token,
                    },
                    body: JSON.stringify({
                    id: res.ID == "" ? undefined : res.ID,
                    update_key: res.updateKey == "" ? undefined : res.updateKey,
                    expires: res.expires,
                    name: res.name,
                    description: res.description,
                    type: "redirect",
                    data: {
                        redirect_to: redirectTo,
                        after_expiry: afterExpiry == "" ? undefined : afterExpiry
                    },
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                    if (data.error) {
                        alert("An error occurred while linking the QR code: " + data.error + " - " + data.message);
                        (document.getElementById("qr-submit") as HTMLInputElement).disabled = false;
                        document.getElementById("qr-submit").innerHTML = "Create";
                    } else {
                        console.log("ID: " + data.id);
                        console.log("Update key: " + data.update_key);
                        alert(
                        "QR code created successfully!\nID: " +
                            data.id +
                            "\nUpdate key: " +
                            data.update_key
                        );
                        window.location.href = "/dashboard";
                    }
                    });
                }).catch((e)=>{
                    if (e.message) alert(e.message)
                    console.error(e)
                    window.removeEventListener('data', receiveRedirect);
                    (document.getElementById("qr-submit") as HTMLInputElement).disabled = false;
                    document.getElementById("qr-submit").innerHTML = "Create";
                })
        }
        function receiveLocation(e: any) {
            const zones = JSON.parse(e.detail.zones)
            validateInputs(type, {data:{zones}}).then((res)=>{
                fetch(apiURL + "/qrcode", {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    Authorization: token,
                    },
                    body: JSON.stringify({
                        id: res.ID == "" ? undefined : res.ID,
                        update_key: res.updateKey == "" ? undefined : res.updateKey,
                        expires: res.expires,
                        name: res.name,
                        description: res.description,
                        type: "redirect",
                        data: {
                            location: zones
                        },
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                    if (data.error) {
                        alert("An error occurred while linking the QR code: " + data.error + " - " + data.message);
                        (document.getElementById("qr-submit") as HTMLInputElement).disabled = false;
                        document.getElementById("qr-submit").innerHTML = "Create";
                    } else {
                        console.log("ID: " + data.id);
                        console.log("Update key: " + data.update_key);
                        alert(
                        "QR code created successfully!\nID: " +
                            data.id +
                            "\nUpdate key: " +
                            data.update_key
                        );
                        window.location.href = "/dashboard";
                    }
                    });
                }).catch((e)=>{
                    if (e.message) alert(e.message)
                    console.error(e)
                    window.removeEventListener('data', receiveLocation);
                    (document.getElementById("qr-submit") as HTMLInputElement).disabled = false;
                    document.getElementById("qr-submit").innerHTML = "Create";
                })
        }
        function verifyResults(e:any) {
            console.log("Received verifyResults event", e.detail)
            if ((e as CustomEvent).detail?.status == "success") {
                window.addEventListener('data', receiveLocation)
                window.dispatchEvent(new CustomEvent("getData"))
            } else {
                (document.getElementById("qr-submit") as HTMLButtonElement).disabled = false;
                document.getElementById("qr-submit").innerHTML = "Create";
            }
        }
        document.getElementById("qr-submit").innerText = "Creating...";
        (document.getElementById("qr-submit") as HTMLButtonElement).disabled = true;
        console.log(type)
        window.removeEventListener('data', receiveScheduleActions)
        window.removeEventListener('data', receiveRedirect)
        window.removeEventListener('data', receiveLocation)
        window.removeEventListener('verifyResults', verifyResults)

        if (type == "redirect") {
            window.addEventListener('data', receiveRedirect)
            window.dispatchEvent(new CustomEvent("getData"))
        } else if (type == "schedule") {
            window.addEventListener('data', receiveScheduleActions)
            window.dispatchEvent(new CustomEvent("getData"))
        } else if (type == "location") {
            // send out a request for location.client.tsx to verify the zones
            window.addEventListener('verifyResults', verifyResults)
            console.log("Sending verifyZones event")
            window.dispatchEvent(new CustomEvent("verifyZones"))
        }
    }


    return (
      <>
        <div id="qr-submit-cntr" className="QRL-container QRL-create">
        <button type="button" id="qr-submit" disabled={buttonDisabled} onClick={submit} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:text-white disabled:bg-blue-300 disabled:hover:bg-blue-300">Create</button>
        </div>
      </>
    );
}