import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";



export default function UserAgentList({
    currentUserAgentList,
    setCurrentUserAgentList
}:{
    currentUserAgentList: {
        browser: string
        browser_is_regex?: boolean
        browser_name?: string
        device: string
        device_is_regex?: boolean
        device_name?: string
        redirect_to: string
        after_expiry?: string
    }[],
    setCurrentUserAgentList: (value: {
        browser: string
        browser_is_regex?: boolean
        browser_name?: string
        device: string
        device_is_regex?: boolean   
        device_name?: string
        redirect_to: string
        after_expiry?: string
    }[]) => void

}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [translation, setTranslation] = useState("human")
    let bottomMargin = -10
    const userAgentList: {
        browser: string,
        browser_is_regex?: boolean,
        browser_name?: string,
        device: string
        device_is_regex?: boolean,
        device_name?: string,
        redirect_to: string,
        after_expiry?: string
    }[] = currentUserAgentList


        useEffect(() => {},
        [userAgentList]);

        useEffect(() => {
            function handleChange() {            
                startTransition(() => {
                  // Refresh the current route and fetch new data from the server without
                  // losing client-side browser or React state.
                  router.refresh();
                });
              }
            window.addEventListener('refreshUserAgentList', () => {
                handleChange()
            });
          }, [router]);
        
        function deleteAction(el:any) {
            let userAgentLoc = el.target.getAttribute("data-loc")
            let userAgentListCopy = [...userAgentList]
            let userAgentLocSplit = userAgentLoc.split(".")
            let browserName = userAgentLocSplit[0]
            let deviceName = userAgentLocSplit[1]

            if (userAgentLocSplit.length === 3) {
                let action = userAgentLocSplit[2]
                if (action === "after_expiry") {
                    userAgentListCopy.forEach((item, index) => {
                        if (item.browser_name === browserName && item.device_name === deviceName) {
                            delete item.after_expiry
                        }
                    })
                }
            } else {
                userAgentListCopy = userAgentListCopy.filter((item) => {
                    return !(item.browser_name === browserName && item.device_name === deviceName)
                })
            }
            

            setCurrentUserAgentList(userAgentListCopy)
            window.dispatchEvent(new CustomEvent("refreshUserAgentList"));

        }

        // sort the schedule by day of the week + time
        function generateScheduleList() {
          
            return (
                <ul style={{ listStyle: "disc", fontSize: "11pt" }}>
                    {userAgentList.map((listItem:{
                        browser: string,
                        browser_is_regex?: boolean,
                        browser_name?: string,
                        device: string,
                        device_is_regex?: boolean,
                        device_name?: string,
                        redirect_to: string,
                        after_expiry?: string,
                    }) => {
                        // browser/device can be a regex string (ending in whatever), "any" (browser only) or a specific browser/device
                        const browserName = listItem.browser_name ?? listItem.browser
                        const deviceName = listItem.device_name ?? listItem.device

                        return (
                            <li key={browserName + "." + deviceName} style={{marginBottom:bottomMargin}}>
                                <p style={{cursor:"pointer",marginBottom:bottomMargin/2}} data-loc={browserName + "." + deviceName} onClick={deleteAction} title="Click to delete">{browserName} / {deviceName}</p>
                                <ul className="moveover" style={{ listStyle: "disc" }}>
                                    <li style={{marginBottom:bottomMargin}}>
                                        <p style={{display:"inline",position:"relative", verticalAlign:"text-bottom"}}>Redirect to: <i style={{fontWeight: 600}} title={listItem.redirect_to}>{listItem.redirect_to}</i></p>
                                    </li>
                                    {listItem.after_expiry && <li style={{marginBottom:bottomMargin}}  >
                                        <p onClick={deleteAction} data-loc={browserName + "." + deviceName + ".after_expiry"} style={{position:"relative",verticalAlign:"text-bottom",cursor:"pointer", display:"inline"}}>After expiry: <i style={{fontWeight: 600,pointerEvents:"none",}} title={listItem.after_expiry}>{listItem.after_expiry}</i></p>
                                    </li>}
                                </ul>
                            </li>
                        )
                    })}
                </ul>
            )
            // (
            //   <ul style={{ listStyle: "disc", fontSize: "11pt" }}>
            //     {orderedDays.filter(key=>Object.keys(userAgentList).includes(key)).map((initial) => (
            //       <li key={initial} style={{marginBottom:bottomMargin}}>
            //         <p style={{cursor:"pointer",marginBottom:bottomMargin/2}} data-loc={initial} onClick={deleteAction} title="Click to delete">{initial[0].toUpperCase() + initial.slice(1)}</p>
            //         {Object.keys(userAgentList[initial]).length > 0 && (
            //           <ul className="moveover" style={{ listStyle: "disc" }}>
            //             {Object.keys(userAgentList[initial]).toSorted().map((internal) => (
            //               <li key={internal} style={{marginBottom:bottomMargin}}>
            //                 <p onClick={deleteAction} style={{cursor:"pointer",marginBottom:bottomMargin}} data-loc={initial+"."+internal} title="Click to delete">{internal!=="ALL_DAY" ? internal : "Entire Day"}</p>
            //                 <ul className="moveover" style={{ listStyle: "circle" }}>
            //                   {Object.keys(userAgentList[initial][internal]).map((internal2) => (
            //                     <li key={internal2} style={{marginBottom:bottomMargin}}>
            //                       {internal2 === "redirect_to" && (
            //                         <p style={{marginBottom:bottomMargin}}>Redirect to: <b style={{pointerEvents: "none"}}>{userAgentList[initial][internal][internal2]}</b></p>
            //                       )}
            //                       {internal2 === "after_expiry" && (
            //                         <p onClick={deleteAction} data-loc={initial+"."+internal+"."+internal2} style={{cursor:"pointer",marginBottom:bottomMargin}} title="Click to delete">After expiry: <b style={{pointerEvents: "none"}}>{userAgentList[initial][internal][internal2]}</b></p>
            //                       )}
            //                       {internal2 !== "redirect_to" && internal2 !== "after_expiry" && (
            //                         <b>Unknown action: {internal2}</b>
            //                         )}
            //                     </li>
            //                   ))}
            //                 </ul>
            //               </li>
            //             ))}
            //           </ul>
            //         )}
            //       </li>
            //     ))}
            //   </ul>
            // );
        }

        function changeCurrentTranslation() {
            setTranslation(translation === "machine" ? "human" : "machine")
            document.getElementById("convert")!.innerText = `(convert to ${translation})`
            window.dispatchEvent(new CustomEvent("refreshUserAgentList"));
        }

        function convert() {







            // function oneSecondBack(time: string) {
            //     let date = new Date("1970-01-02T" + time)
            //     date.setSeconds(date.getSeconds() - 1)
            //     return date.toLocaleString("en-gb").replace(/.*, /,"")
            // }
            // function oneSecondForward(time: string) {
            //     let date = new Date("1970-01-02T" + time)
            //     date.setSeconds(date.getSeconds() + 1)
            //     return date.toLocaleString("en-gb").replace(/.*, /,"")
            // }
            // let humanReadable: Array<JSX.Element> = []
            // if (translation === "human") {
 
            //     const DaysOrdered = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

            //     const ScheduleDaysOrdered = Object.keys(userAgentList).sort((a, b) => DaysOrdered.indexOf(a) - DaysOrdered.indexOf(b))
            
            
            //     // for each day in the schedule
            //     for (let day in userAgentList) {
            //         if (day == "timezone") continue
            
            //         // for each time in the day
            //         for (let time in userAgentList[day]) {
            
            //             const FROM_DAY = day
            //             const FROM_TIME = time == "ALL_DAY" ? "00:00" : time
            
            //             const FROM_IS_LAST_TIME_IN_DAY = Object.keys(userAgentList[day]).length - 1 === Object.keys(userAgentList[day]).indexOf(time)
            
            //             let TO_DAY = FROM_IS_LAST_TIME_IN_DAY ? ScheduleDaysOrdered[(ScheduleDaysOrdered.indexOf(day) + 1) % ScheduleDaysOrdered.length] : FROM_DAY
            //             let TO_TIME = FROM_IS_LAST_TIME_IN_DAY ? Object.keys(userAgentList[ScheduleDaysOrdered[(ScheduleDaysOrdered.indexOf(day) + 1) % ScheduleDaysOrdered.length]])[0] : Object.keys(userAgentList[day])[Object.keys(userAgentList[day]).indexOf(time) + 1]
                        
            
            //             if (TO_TIME === "ALL_DAY" || TO_TIME === "00:00") {
            //                 TO_DAY = DaysOrdered[(DaysOrdered.indexOf(TO_DAY) - 1) % DaysOrdered.length] // go back one day
            //             }
            //             TO_TIME = oneSecondBack(TO_TIME === "ALL_DAY" ? "00:00" : TO_TIME)
            
            
            //             // LAST DAY AND TIME
            //             const FROM_IS_LAST_DAY = ScheduleDaysOrdered.length - 1 === ScheduleDaysOrdered.indexOf(FROM_DAY)
                        
            //             if (FROM_IS_LAST_DAY && FROM_IS_LAST_TIME_IN_DAY) {
            //                 TO_DAY = ScheduleDaysOrdered[0]
            //                 TO_TIME = Object.keys(userAgentList[ScheduleDaysOrdered[0]])[0]
            
            //                 if (TO_TIME === "ALL_DAY" || TO_TIME === "00:00") {
            //                     // SET TO_DAY TO THE DAY BEFORE THE FIRST DAY IN THE SCHEDULE
            //                     const FIRST_DAY_IN_SCHEDULE = ScheduleDaysOrdered[0]
            //                     TO_DAY =(DaysOrdered.indexOf(FIRST_DAY_IN_SCHEDULE) - 1) < 0 ? DaysOrdered[DaysOrdered.length - 1] : DaysOrdered[(DaysOrdered.indexOf(FIRST_DAY_IN_SCHEDULE) - 1) % DaysOrdered.length]
            //                 }
            //                 TO_TIME = oneSecondBack(TO_TIME === "ALL_DAY" ? "00:00" : TO_TIME)
            //             }
            //             let redirect_to = userAgentList[FROM_DAY][FROM_TIME].redirect_to
            //             let after_expiry = userAgentList[FROM_DAY][FROM_TIME].after_expiry
            //             if (redirect_to.length > 27) {
            //                 redirect_to = redirect_to.slice(0, 15) + "..." + redirect_to.slice(redirect_to.length - 12)
            //             }
            //             if (after_expiry) {
            //                 if (after_expiry.length > 27) {
            //                     after_expiry = after_expiry.slice(0, 15) + "..." + after_expiry.slice(after_expiry.length - 12)
            //                 }
            //             }
            //             humanReadable.push(
            //                 <li key={FROM_DAY + FROM_TIME + "_" + TO_DAY + TO_TIME} style={{marginBottom:bottomMargin, listStylePosition:"inside"}} >
            //                     <p onClick={deleteAction} data-loc={FROM_DAY+"."+time} style={{cursor:"pointer", display:"inline",position:"relative",left:-15,}}>From <b style={{pointerEvents:"none"}}>{FROM_DAY[0].toUpperCase() + FROM_DAY.slice(1)} at {FROM_TIME}</b> to <b style={{pointerEvents:"none"}}>{TO_DAY[0].toUpperCase() + TO_DAY.slice(1)} at {TO_TIME}</b></p>
            //                     <ul style={{listStyle:"circle", marginTop:bottomMargin*.75, listStylePosition:"inside"}} className="moveover">
            //                         <li style={{marginBottom:bottomMargin, listStylePosition:"inside"}}>
            //                             <p style={{display:"inline",position:"relative",left:-15,}}>Redirect to: <i style={{fontWeight: 600}} title={userAgentList[FROM_DAY][FROM_TIME].redirect_to}>{redirect_to}</i></p>
            //                         </li>
            //                         {after_expiry && <li style={{marginBottom:bottomMargin, listStylePosition:"inside"}}  >
            //                             <p onClick={deleteAction} data-loc={FROM_DAY+"."+time+".after_expiry"} style={{position:"relative",left:-15,cursor:"pointer", display:"inline"}}>After expiry: <i style={{fontWeight: 600,pointerEvents:"none",}} title={userAgentList[FROM_DAY][FROM_TIME].after_expiry}>{after_expiry}</i></p>
            //                         </li>}
            //                     </ul>
            //                 </li>
            //             )
            //             // humanReadable.push(
            //             //     <p key={FROM_DAY + FROM_TIME + "_" + TO_DAY + TO_TIME}>FROM <b>{FROM_DAY.toUpperCase()} {FROM_TIME}</b> TO <b>{TO_DAY.toUpperCase()} {TO_TIME}</b>, REDIRECT TO: <b title={schedule[FROM_DAY][FROM_TIME].redirect_to}>{redirect_to}</b>{after_expiry ? ". IF EXPIRED, REDIRECT TO: ":""}{after_expiry?<b title={schedule[FROM_DAY][FROM_TIME].after_expiry}>{after_expiry}</b>:<></>}</p>
            //             // )
            //         }
            
            //     }
                
                
                

                

            //     return (<ul style={{fontSize:"11pt", listStyle:"disc", marginBottom:bottomMargin}}>{humanReadable}</ul>)
            // } else 
            return generateScheduleList()
        }
        
    return <>
        <p className="qr-info-label flex justify-center items-center flex-wrap">
            <b>Current List:</b>
            <span id="convert" hidden={currentUserAgentList.length < 1} style={{
                        fontSize: '8pt',
                        flexBasis: '100%',
                        marginTop: -5
                    }} onClick={changeCurrentTranslation}
                    >(convert to {translation=="machine"?"human":"machine"})</span>
          </p>
        <div id="scheduleList" style={{
            marginBottom:20,
            fontSize: "11pt",
            left: "50%",
            transform: "translateX(-50%) scale(0.9)",
            position: "relative",
            width: 420,
            display:"flex",
            justifyContent:"center",
}}>
        {currentUserAgentList.length > 0 ? convert() : <i style={{fontSize:14}}>No user-agents defined</i>}
        </div>
    </>
}
