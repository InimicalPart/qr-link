import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function ScheduleList({
    currentScheduleActions,
    setCurrentScheduleActions
}:{
    currentScheduleActions: {
        [key: string]: {
            [key: string]: {
                redirect_to: string,
                after_expiry?: string
            }
        }
    },
    setCurrentScheduleActions: (value: {
        [key: string]: {
            [key: string]: {
                redirect_to: string,
                after_expiry?: string
            }
        }
    }) => void

}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [translation, setTranslation] = useState("machine")
    let bottomMargin = -10
    const schedule: {
        [key: string]: {
            [key: string]: {
                redirect_to: string,
                after_expiry?: string
            }
        }
    } = currentScheduleActions


        useEffect(() => {
            function handleChange() {            
                startTransition(() => {
                  // Refresh the current route and fetch new data from the server without
                  // losing client-side browser or React state.
                  router.refresh();
                });
              }
            window.addEventListener('refreshScheduleList', () => {
                handleChange()
            });
          }, [router]);
        
        function deleteAction(el:any) {
            let scheduleLoc = el.target.getAttribute("data-loc")
            let scheduleLocSplit = scheduleLoc.split(".")
            let scheduleCopy = JSON.parse(JSON.stringify(schedule))
            if (scheduleLocSplit.length === 1) {
                delete scheduleCopy[scheduleLoc]
            } else if (scheduleLocSplit.length === 2) {
                delete scheduleCopy[scheduleLocSplit[0]][scheduleLocSplit[1]]
                if (Object.keys(scheduleCopy[scheduleLocSplit[0]]).length === 0) {
                    delete scheduleCopy[scheduleLocSplit[0]]
                }
            } else if (scheduleLocSplit.length === 3) {
                delete scheduleCopy[scheduleLocSplit[0]][scheduleLocSplit[1]][scheduleLocSplit[2]]
                if (Object.keys(scheduleCopy[scheduleLocSplit[0]][scheduleLocSplit[1]]).length === 0) {
                    delete scheduleCopy[scheduleLocSplit[0]][scheduleLocSplit[1]]
                }
                if (Object.keys(scheduleCopy[scheduleLocSplit[0]]).length === 0) {
                    delete scheduleCopy[scheduleLocSplit[0]]
                }
            }

            setCurrentScheduleActions(scheduleCopy)
            window.dispatchEvent(new CustomEvent("refreshScheduleList"));

        }
        // sort the schedule by day of the week + time
        function generateScheduleList() {
            const orderedDays = [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ];
          
            return (
              <ul style={{ listStyle: "disc",marginBottom:30 }}>
                {orderedDays.filter(key=>Object.keys(schedule).includes(key)).map((initial) => (
                  <li key={initial} style={{marginBottom:bottomMargin}}>
                    <p style={{cursor:"pointer",marginBottom:bottomMargin/2}} data-loc={initial} onClick={deleteAction} title="Click to delete">{initial[0].toUpperCase() + initial.slice(1)}</p>
                    {Object.keys(schedule[initial]).length > 0 && (
                      <ul className="moveover" style={{ listStyle: "disc" }}>
                        {Object.keys(schedule[initial]).toSorted().map((internal) => (
                          <li key={internal} style={{marginBottom:bottomMargin}}>
                            <p onClick={deleteAction} style={{cursor:"pointer",marginBottom:bottomMargin}} data-loc={initial+"."+internal} title="Click to delete">{internal!=="ALL_DAY" ? internal : "Entire Day"}</p>
                            <ul className="moveover" style={{ listStyle: "circle" }}>
                              {Object.keys(schedule[initial][internal]).map((internal2) => (
                                <li key={internal2} style={{marginBottom:bottomMargin}}>
                                  {internal2 === "redirect_to" && (
                                    <p onClick={deleteAction} data-loc={initial+"."+internal+"."+internal2} style={{cursor:"pointer",marginBottom:bottomMargin}} title="Click to delete">Redirect to: {schedule[initial][internal][internal2]}</p>
                                  )}
                                  {internal2 === "after_expiry" && (
                                    <p onClick={deleteAction} data-loc={initial+"."+internal+"."+internal2} style={{cursor:"pointer",marginBottom:bottomMargin}} title="Click to delete">After expiry: {schedule[initial][internal][internal2]}</p>
                                  )}
                                  {internal2 !== "redirect_to" && internal2 !== "after_expiry" && (
                                    <b>Unknown action: {internal2}</b>
                                    )}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            );
        }

        function changeCurrentTranslation() {
            setTranslation(translation === "machine" ? "human" : "machine")
            document.getElementById("convert")!.innerText = `(convert to ${translation})`
            window.dispatchEvent(new CustomEvent("refreshScheduleList"));
        }

        function convert() {

            function getNextAction(lastAction: string,schedule: {
                [key: string]: {
                    [key: string]: {
                        redirect_to: string,
                        after_expiry?: string
                    }
                }
            
            }) {
                let orderedDays = [
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday"
                ]

                // last action will look like <day>.<time/"ALL_DAY">
                let lastActionSplit = lastAction.split(".")

                let dayToCheck = lastActionSplit[0]
                if (lastActionSplit[1] === "ALL_DAY") {
                    dayToCheck = orderedDays[(orderedDays.indexOf(dayToCheck) + 1) % 7]
                }

                let actionFound = false
                while (!actionFound) {
                    if (Object.keys(schedule).includes(dayToCheck)) {
                        let daySchedule = schedule[dayToCheck]
                        let times = Object.keys(daySchedule)
                        if (lastActionSplit[0] === dayToCheck) {
                            let nextTime = times[(times.indexOf(lastActionSplit[1]) + 1) % times.length]
                            if (times.indexOf(nextTime) === 0) {
                                dayToCheck = orderedDays[(orderedDays.indexOf(dayToCheck) + 1) % 7]
                            } else {
                                actionFound = true
                                return dayToCheck + "." + nextTime
                            }
                        } else {
                            actionFound = true
                            return dayToCheck + "." + times[0]
                        }
                    }
                    dayToCheck = orderedDays[(orderedDays.indexOf(dayToCheck) + 1) % 7]
                }
            }
            function oneSecondBack(time: string) {
                let date = new Date("1970-01-02T" + time)
                date.setSeconds(date.getSeconds() - 1)
                return date.toLocaleString("en-gb").replace(/.*, /,"")
            }
            function oneSecondForward(time: string) {
                let date = new Date("1970-01-02T" + time)
                date.setSeconds(date.getSeconds() + 1)
                return date.toLocaleString("en-gb").replace(/.*, /,"")
            }
            if (translation === "human") {
 
                
                let orderedDays = [
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday"
                ]

                let scheduleCopy = JSON.parse(JSON.stringify(currentScheduleActions))
                
                /*
                
                {
                    "monday": {
                        "ALL_DAY": {
                            "redirect_to": "https://somerandom.website"
                        }
                    },
                    "tuesday": {
                        "12:30": {
                            "redirect_to": "https://google.com"
                        },
                        "13:00": {
                            "redirect_to": "https://newseed.se"
                        }
                    },
                    "thursday": {
                        "ALL_DAY": {
                            "redirect_to": "https://google.com"
                        }
                    },
                    "friday": {
                        "23:00": {
                            "redirect_to": "https://inimicalpart.com"
                        }
                    }
                    
                }
                
                should become
                
                FROM MONDAY 00:00 TO TUESDAY 12:29:59, REDIRECT TO https://somerandom.website
                FROM TUESDAY 12:30 TO TUESDAY 12:59:59, REDIRECT TO https://google.com
                FROM TUESDAY 13:00 TO WEDNESDAY 23:59:59, REDIRECT TO https://newseed.se
                FROM THURSDAY 00:00 TO FRIDAY 22:59:59, REDIRECT TO https://google.com
                FROM FRIDAY 23:00 TO SUNDAY 23:59:59, REDIRECT TO https://inimicalpart.com
                
                */
               
               let humanReadable: Array<JSX.Element> = [];

               let iterations = 0
               for (let day of orderedDays) {
                   if (Object.keys(scheduleCopy).includes(day)) {
                        const times = Object.keys(scheduleCopy[day])
                        for (let time of times) {
                            let nextTime = getNextAction(day+"."+time,scheduleCopy)
                            let NEXT_DAY = nextTime.split(".")[0]
                            if (times.indexOf(time) === 0 && times.length > 1) { // if is first time in day
                            humanReadable.push(<p key={iterations}>FROM <b>{day[0].toUpperCase() + day.substring(1)} {time === "ALL_DAY" ? "00:00" : time}</b> TO <b>{NEXT_DAY[0].toUpperCase() + NEXT_DAY.substring(1)} {oneSecondBack(nextTime.split(".")[1] == "ALL_DAY" ? "00:00" : nextTime.split(".")[1])}</b>, REDIRECT TO {scheduleCopy[day][time].redirect_to}</p>)
                        } else {
                                let sortedDays = orderedDays.filter(key=>Object.keys(scheduleCopy).includes(key))
                                console.log(day, time, times.indexOf(time), times.length - 1, sortedDays.indexOf(day), sortedDays.length - 1)
                                // if last time and last day
                                if (times.indexOf(time) === times.length - 1 && sortedDays.indexOf(day) === sortedDays.length - 1) {
                                    // get first action in schedule
                                    let firstDay = orderedDays[0]
                                    let firstTime = Object.keys(scheduleCopy[firstDay])[0]
                                    // if time is ALL_DAY or 00:00, set firstDay to the day before
                                    console.log(firstDay, firstTime)
                                    if (firstTime === "ALL_DAY" || firstTime === "00:00") {
                                        firstDay = sortedDays[sortedDays.indexOf(day) - 1 < 0 ? sortedDays.length - 1 : sortedDays.indexOf(day) - 1]
                                    }
                                    humanReadable.push(<p key={iterations}>FROM <b>{day[0].toUpperCase() + day.substring(1)} {time}</b> TO <b>{firstDay[0].toUpperCase() + firstDay.substring(1)} {oneSecondBack(firstTime === "ALL_DAY" ? "00:00" : firstTime)}</b>, REDIRECT TO {scheduleCopy[day][time].redirect_to}</p>)
                                    continue
                                }

                                let NEXT_DAY = nextTime.split(".")[0]
                                if (sortedDays.indexOf(day) === sortedDays.length - 1) {
                                    // console.log(day, time)
                                    NEXT_DAY = orderedDays[orderedDays.indexOf(NEXT_DAY) - 1 < 0 ? orderedDays.length - 1 : orderedDays.indexOf(NEXT_DAY) - 1]
                                }
                                // if is last day in defined schedule
                                
                                // if last time in day
                                if (times.indexOf(time) === times.length - 1) {
                                    let nextDay = orderedDays[(orderedDays.indexOf(day) + 1) % 7]
                                    humanReadable.push(<p key={iterations}>FROM <b>{day[0].toUpperCase() + day.substring(1)} {time}</b> TO <b>{nextDay[0].toUpperCase() + nextDay.substring(1)} {oneSecondBack(nextTime.split(".")[1] == "ALL_DAY" ? "00:00" : nextTime.split(".")[1])}</b>, REDIRECT TO {scheduleCopy[day][time].redirect_to}</p>)
                                    continue
                                }
                                
                                let nextDayIndex = orderedDays.indexOf(nextTime.split(".")[0]) - 1;
                                let nextDay = orderedDays[nextDayIndex < 0 ? orderedDays.length - 1 : nextDayIndex];

                                if (nextTime.split(".")[1] == "ALL_DAY") {
                                    humanReadable.push(<p key={iterations}>FROM <b>{day[0].toUpperCase() + day.substring(1)} {time}</b> TO <b>{nextDay[0].toUpperCase() + nextDay.substring(1)} {oneSecondBack(nextTime.split(".")[1] == "ALL_DAY" ? "00:00" : nextTime.split(".")[1])}</b>, REDIRECT TO {scheduleCopy[day][time].redirect_to}</p>)
                                } else {
                                    humanReadable.push(<p key={iterations}>FROM <b>{day[0].toUpperCase() + day.substring(1)} {time}</b> TO <b>{nextTime.split(".")[0][0].toUpperCase() + nextTime.split(".")[0].substring(1)} {oneSecondBack(nextTime.split(".")[1] == "ALL_DAY" ? "00:00" : nextTime.split(".")[1])}</b>, REDIRECT TO {scheduleCopy[day][time].redirect_to}</p>)
                                }
                            }
                                

                        }
                   }
                   iterations++
                }

                

                return (<>{humanReadable}</>)
            } else return generateScheduleList()
        }
        
    return <>
        <p className="qr-info-label flex justify-center items-center flex-wrap">
            <b>Current Schedule:</b>
            <span id="convert" hidden={Object.keys(currentScheduleActions).length < 1} style={{
                        fontSize: '8pt',
                        flexBasis: '100%',
                        marginTop: -5
                    }} onClick={changeCurrentTranslation}
                    >(convert to {translation=="machine"?"human":"machine"})</span>
          </p>
        <div id="scheduleList" style={{
            marginBottom:20
}}>
        {Object.keys(currentScheduleActions).length > 0 ? convert() : <i style={{fontSize:14}}>No actions defined</i>}
        </div>
    </>
}