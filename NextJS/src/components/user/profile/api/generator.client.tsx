"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2-ql";
import "@sweetalert2/theme-dark"

export default function APIKeyGenerator({
    API_URL,
    token,
    onRevoke,
    updateAPIName
}:{
    API_URL: string,
    token: string,
    onRevoke: (id:string) => void,
    updateAPIName: (id:string, name:string) => void
}) {

    type APIKeyOutput = APIKey & {token_preview: string}

    const [apikeys, setAPIKeys] = useState<APIKeyOutput[]>([])
    const [containerWidth, setContainerWidth] = useState<number>(Infinity)
    const [windowWidth, setWindowWidth] = useState<number>(Infinity)


            useEffect(() => {
                function fetchAPIs(): Promise<APIKeyOutput[]> {
                    return new Promise((resolve, reject) => {
                    fetch(API_URL +  "/user/api-keys", { headers: { Authorization: `${token}` } })
                        .then((response) => response.json())
                        .then((data) => {
                        if (data.error) {
                            reject(data.error);
                        } else {
                            resolve(data.keys);
                        }
                        });
                    });
                }
                fetchAPIs().then((codes) => {
                    console.log(codes)
                    setAPIKeys(codes)
                });
            }, [API_URL, token]);


            useEffect(() => {
                function handleResize() {
                    setWindowWidth(window.innerWidth)
                }
                window.addEventListener("resize", handleResize)
                handleResize()
                return () => window.removeEventListener("resize", handleResize)
            })

            useEffect(() => {
                const currentContainerWidth = document.getElementById("api-key-container")?.clientWidth
                if (containerWidth !== currentContainerWidth) setContainerWidth(currentContainerWidth ?? Infinity)
            }, [windowWidth])
        
        function onEditClicked(e:any) {
            
                let keyContainer = null
                // find the parent element that starts with id "api-key-"
                let parent = e.target
                while (parent) {
                    if (parent.id?.toString().startsWith("api-key-")) {
                        keyContainer = parent
                        break
                    }
                    parent = parent.parentElement
                }
                if (!keyContainer) return
        
                const id = keyContainer.id.replace("api-key-", "")

                Swal.fire({
                    title: "Edit API key",
                    html: "You can edit the name of the API key here.",
                    input: "text",
                    inputValue: apikeys.find(a=>a.id==id).name,
                    showCancelButton: true,
                    confirmButtonText: "Save",
                    cancelButtonText: "Cancel",
                    preConfirm: async (name) => {
                        const newName = name == "" ? null : name;
                        //update the name of the API key

                        const result = await updateAPIName(id, newName)
                        
                        if ((result as any).error) {
                            Swal.showValidationMessage(
                                `Request failed: ${(result as any).error}`
                            )
                            return false
                        } else {

                            
                            const newAPIKeys = apikeys.map((key) => {
                                if (key.id === e) {
                                    return {
                                        ...key,
                                        name: newName
                                    }
                                }
                                return key
                            })
                            console.log(newAPIKeys)
                            setAPIKeys(newAPIKeys)
                            
                            const toast = Swal.mixin({
                                toast: true,
                                position: "top",
                                showConfirmButton: false,
                                timer: 3000,
                                timerProgressBar: true,
                                didOpen: (toast) => {
                                    toast.addEventListener("mouseenter", Swal.stopTimer)
                                    toast.addEventListener("mouseleave", Swal.resumeTimer)
                                }
                            })
                            
                            toast.fire({
                                icon: "success",
                                title: "Name successfully updated"
                            })
                            return true
                        }
                    }

            })
        }


            function formatDate(date: Date) {
                const now = new Date();
                const diff = now.getTime() - date.getTime();
                const diffInSeconds = diff / 1000;
                const diffInMinutes = Math.floor(diffInSeconds / 60);
                const diffInHours = Math.floor(diffInMinutes / 60);
            
                if (diffInHours < 24 && now.getDate() === date.getDate()) {
                    const hours = date.getHours() % 12 || 12;
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    const period = date.getHours() >= 12 ? "PM" : "AM";
                    return `Today at ${hours}:${minutes} ${period}`;
                } else if (diffInHours < 48) {
                    const hours = date.getHours() % 12 || 12;
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    const period = date.getHours() >= 12 ? "PM" : "AM";
                    return `Yesterday at ${hours}:${minutes} ${period}`;
                } else {
                    const month = date.toLocaleString("default", { month: "short" });
                    const day = date.getDate();
                    const year = date.getFullYear();
                    const hours = date.getHours() % 12 || 12;
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    const period = date.getHours() >= 12 ? "PM" : "AM";
                    return `${month} ${day}, ${year} at ${hours}:${minutes} ${period}`;
                }
            }

            function onRevokeConfirmation(id:string) {
                Swal.fire({
                    title: "Are you sure?",
                    html: "You're about to permanentely revoke API key with token:<br/><br/><b>"+apikeys.find(a=>a.id==id).token_preview+"</b><br/><br/>You will not be able to recover this API key, and any applications using it will stop working.",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Yes, revoke it!",
                    cancelButtonText: "No, keep it",
                    didOpen: (modal) => {
                        //disable confirm button for 5 seconds
                        const confirmButton = modal.querySelector('.swal2-confirm') as any
                        confirmButton.disabled = true
                        // and show a countdown instead of the text in the button
                        const previousText = confirmButton.innerText
                        let secondsLeft = 5
                        confirmButton.innerText = previousText + " (" + secondsLeft + ")"
                        const countdown = setInterval(() => {
                            secondsLeft--
                            confirmButton.innerText = previousText + " (" + secondsLeft + ")"
                            if (secondsLeft <= 0) {
                                clearInterval(countdown)
                                confirmButton.disabled = false
                                confirmButton.innerText = previousText
                            }
                        }, 1000)
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        (onRevoke(id) as any).then(()=>{
                            Swal.fire({
                                title: "Revoked!",
                                text: "The API key has been revoked.",
                                icon: "success",
                                didClose: () => setAPIKeys(apikeys.filter(a=>a.id!=id))
                            })
                        })
                    }
                });
            }

            function updateBadges(key: APIKeyOutput) {

                const badgeCountMap = {
                    "788": 4, //!  + '+X more' badge
                    "684": 3, //!  + '+X more' badge
                    "580": 2, //!  + '+X more' badge
                    "476": 1, //!  + '+X more' badge
                    "342": 0, //!  + '+X more' badge
                }

                function howManyBadgesToShow(permissions: string[]) {
                    const maximum = Math.max(...Object.keys(badgeCountMap).map(a=>parseInt(a)))
                    const minimum = Math.min(...Object.keys(badgeCountMap).map(a=>parseInt(a)))
                    if (containerWidth > maximum) return permissions.length
                    if (containerWidth <= minimum) return 0

                    // get closests number that is above the containerWidth
                    const closest = Object.keys(badgeCountMap).sort((a,b)=>parseInt(a)-parseInt(b)).find(a=>parseInt(a) >= containerWidth)

                    return badgeCountMap[closest as keyof typeof badgeCountMap]

                }

                return (<>
                    {(()=>{

                        //! Sort the permissions alphabetically
                        const sorted = key.permissions.toSorted((a,b)=>{
                            const aSliced = a.split(":")[0]
                            const aSliced2 = a.split(":")[1]
                            const bSliced = b.split(":")[0]
                            const bSliced2 = b.split(":")[1]

                            //! First part (XYZ:*) is sorted alphabetically
                            if (aSliced < bSliced) return -1
                            if (aSliced > bSliced) return 1

                            //! Second part (*:XYZ) is sorted alphabetically
                            if (aSliced2 < bSliced2) return -1
                            if (aSliced2 > bSliced2) return 1

                            return 0
                        })

                        //! Get the amount of badges to show based on the width of the container
                        const howManyBadges = howManyBadgesToShow(key.permissions)

                        //! Get the first X permissions and map them to a badge
                        const cut = sorted.slice(0, howManyBadges)
                        const result = cut.map((perm, index) => {
                            return <span key={perm} className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full">{perm}</span>
                        })
                        
                        if (key.permissions.length > howManyBadges) {
                            //! Add a '+X more' badge if there are more permissions than the amount of badges shown, or show how many permissions there are if only 1 badge fits
                            result.push(
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full">{howManyBadges > 0 ? "+" + (key.permissions.length - howManyBadges).toString() + " more": key.permissions.length.toString() + " permissions" }</span>
                            )
                        }

                        return result
                    
                })()}
            </>)
        }

    return (
        <>
        {apikeys.toSorted((a,b)=>{
            if (a.created < b.created) return -1
            if (a.created > b.created) return 1
            return 0
        }).map((key: APIKeyOutput, index: number) => {  
            
            const onRevokeClickedWithID = onRevokeConfirmation.bind(null, key.id)


            return (<div key={key.id}>
                <div id={"api-key-"+key.id}  className="api-key">
                    <p className={"name " + (!key.name ? "no-name":"")}>{key.name ?? <i>No name</i>}</p>
                    <p className="token-preview">{key.token_preview}</p>
                    <div className="api-badges">
                            {updateBadges(key)}
                    </div>
                    <p title={key.last_used ? formatDate(new Date(key.last_used)) : "Never"} className="last-used">Last used: {key.last_used ? formatDate(new Date(key.last_used)) : "Never"}</p>
                    <p title={key.created ? formatDate(new Date(key.created)) : "Never"} className="created">Created: {key.created ? formatDate(new Date(key.created)) : "Never"}</p>
                    <button onClick={onEditClicked} className="edit-button">Edit</button>
                    <button onClick={onRevokeClickedWithID} className="revoke-button">Revoke</button>
                </div>
                <hr style={{background: "darkgray",height:2, width: "97%", left:"50%", position:"relative",transform:"translateX(-50%)"}}/>
                </div>
            )
        })}
        </>
    )
}
