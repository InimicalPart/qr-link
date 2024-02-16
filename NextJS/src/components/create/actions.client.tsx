"use client";

import { use, useEffect, useState } from "react";
import ScheduleList from "./scheduleList.client";
// import {useRouter} from "next/navigation"

import moment from "moment-timezone";
import Location from "./location.client";

interface ScheduleAction {
    [key: string]: {
        [key: string]: {
            redirect_to: string,
            after_expiry?: string
        }
    }
}
export default function Actions({
    token,
    apiURL
}: {
        token: string,
        apiURL: string
}) {
    function getPassedTime(times: string[], currentTime: string) {
        let diffs: number[] = []
        for (let time of times) {
            let nextChange = moment("1970-01-02T" + time)
            let now = moment("1970-01-02T"+currentTime)
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


    let [currentScheduleActions, setCurrentScheduleActions] = useState<ScheduleAction>({});
    let action = ""
    console.log("RELOAD")
    const [allDay, setAllDay] = useState(false);

    const handleCheckboxChange = (event: { target: { checked: boolean | ((prevState: boolean) => boolean); }; }) => {
      setAllDay(event.target.checked);
    };
    function onActionChange() {
        console.log("Action changed", (document.getElementById("qr-action") as HTMLSelectElement).value)
        action = (document.getElementById("qr-action") as HTMLSelectElement).value
        if (action === "redirect") {
            document.getElementById("redirectContainer").style.display = "block"
            document.getElementById("scheduleContainer").style.display = "none"
            document.getElementById("locationContainer").style.display = "none"
        } else if (action === "schedule") {
            document.getElementById("redirectContainer").style.display = "none"
            document.getElementById("scheduleContainer").style.display = "block"
            document.getElementById("locationContainer").style.display = "none"
        } else if (action === "location") {
            document.getElementById("redirectContainer").style.display = "none"
            document.getElementById("scheduleContainer").style.display = "none"
            document.getElementById("locationContainer").style.display = "block"
        } else {
            document.getElementById("redirectContainer").style.display = "none"
            document.getElementById("scheduleContainer").style.display = "none"
            document.getElementById("locationContainer").style.display = "none"
        }

        window.dispatchEvent(new CustomEvent('typeChange', { detail: action }));
    }
    useEffect(() => {
        function getData() {
            if (action == "schedule") {
                window.dispatchEvent(new CustomEvent("data", { detail: {...currentScheduleActions, timezone: (document.getElementById("scheduletimezone") as HTMLSelectElement).value}}));
            } else if (action == "redirect") {
                window.dispatchEvent(new CustomEvent("data", { detail: {
                    redirect_to: (document.getElementById("redirect") as HTMLInputElement).value == "" ? undefined : (document.getElementById("redirect") as HTMLInputElement).value,
                    after_expiry: (document.getElementById("AERedirect") as HTMLInputElement).value == "" ? undefined : (document.getElementById("AERedirect") as HTMLInputElement).value
                }}));
            }
        }
        window.addEventListener("getData", getData)
        return () => {
            window.removeEventListener("getData", getData)
        }
    }, [currentScheduleActions, action]);

    return (
      <>
        <div id="qr-actiontype-cntr" className="QRL-container">
          <p className="qr-info-label flex justify-center items-center flex-wrap">
            <b>Action:</b>
          </p>
          <select
            id="qr-action"
            onChange={onActionChange}
            className="disabled:bg-neutral-400"
            style={{
              border: "1px black solid",
              borderRadius: 8,
              textAlign: "center",
              width: 300,
            }}
            defaultValue=""
          >
            <option value="">
              --Please choose an option--
            </option>
            <option value="redirect">Redirect</option>
            <option value="schedule">Schedule</option>
            <option value="location">Location</option>
          </select>
          <div
            id="actionContainer"
            style={{
              marginTop: 20,
            }}
          >
            <div id="redirectContainer" style={{ display: "none",
                border: "1px solid black",
                paddingBottom: 10,
                paddingTop: 10,
                borderRadius: 8
              }}>
            <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Redirect to</b></p>
                <textarea
                  id="redirect"
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
                    height: 30
                  }}
                ></textarea>
                <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10}} title="Where to navigate once the QR-code has expired"><b>After Expiry</b> <span style={{
                        fontSize: '8pt',
                        flexBasis: '100%',
                        marginTop: -5
                    }}>(optional)</span></p>
                <textarea
                  id="AERedirect"
                  placeholder="URL / VCard / ..."
                  className="disabled:bg-neutral-400"
                  autoCapitalize="none"
                  autoCorrect="none"
                  spellCheck="false"
                  style={{
                    border: "1px black solid",
                    borderRadius: 8,
                    textAlign: "center",
                    maxHeight: 250,
                    minHeight: 30,
                    height: 30
                  }}
                ></textarea>
            </div>
            <div id="scheduleContainer" style={{ display: "none" }}>
              <div id="currentActions">
                <ScheduleList currentScheduleActions={currentScheduleActions} setCurrentScheduleActions={setCurrentScheduleActions}/>
              </div>
              <div id="newAction" style={{
                border: "1px solid black",
                paddingBottom: 10,
                paddingTop: 10,
                borderRadius: 8
              }}>
                {/* Allow the user to specify a week day (Monday, Tuesday, ...), and a time in HH:MM:SS format (use <input>) or "All day", then allow the user to specify actions like redirect_to and after_expiry */}
                <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Week Day</b></p>
                <select
                  id="weekDay"
                  className="disabled:bg-neutral-400"
                  style={{
                    border: "1px black solid",
                    borderRadius: 8,
                    width:250,
                    paddingLeft:5
                }}
                >
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
                <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10}}><b>Time</b></p>
                <input
                  type="time"
                  id="time"
                  disabled={allDay}
                  className={`disabled:bg-neutral-400 ${
                    allDay ? "opacity-50" : ""
                  }`}
                  style={{
                    border: "1px black solid",
                    borderRadius: 8,
                    width:250,
                    paddingLeft:5
                }}
                />
                <div>
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={allDay}
                    onChange={handleCheckboxChange}
                  />
                  <label style={{marginLeft:5}} htmlFor="allDay">All day</label>
                </div>

                <br/>
                {/* show both actions at the same time */}
                <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Redirect to</b></p>
                <textarea
                  id="scheduleRedirect"
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
                    height: 30
                }}
                ></textarea>
                <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10}} title="Where to navigate once the QR-code has expired"><b>After Expiry</b> <span style={{
                        fontSize: '8pt',
                        flexBasis: '100%',
                        marginTop: -5
                    }}>(optional)</span></p>
                <textarea
                  id="scheduleAERedirect"
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
                    height: 30
                  }}
                ></textarea>
                <br/>
                <br/>
                <button
                  onClick={() => {
                    /* day and time is required, as well as redirect_to */
                    let day = (
                      document.getElementById("weekDay") as HTMLSelectElement
                    ).value;
                    let time = (
                      document.getElementById("time") as HTMLInputElement
                    ).value;
                    let allDay = (
                        document.getElementById("allDay") as HTMLInputElement
                        ).checked;
                    let redirect_to = (
                      document.getElementById(
                        "scheduleRedirect"
                      ) as HTMLInputElement
                    ).value.trim()?.replace(/\n/g,"%0A") ?? ""
                    let after_expiry = (
                      document.getElementById("scheduleAERedirect") as HTMLInputElement
                    ).value.trim()?.replace(/\n/g,"%0A") ?? ""
                    if (day === "" || (time === "" && !allDay) || redirect_to === "") {
                        alert("Please fill in all required fields. [DAY, TIME, REDIRECT_TO]");
                        return;
                    }
                    if (allDay) {
                      time = "ALL_DAY";
                    }
                    let additional = {}
                    if (after_expiry !== "") {
                      additional = {
                        after_expiry
                      }
                    }
                    if (currentScheduleActions[day] === undefined) {
                      currentScheduleActions[day] = {};
                    }
                    // if time is set but day has "ALL_DAY" then alert
                    if (currentScheduleActions[day]["ALL_DAY"]) {
                        if (confirm("An action for the whole day already exists, overwrite?")) {
                            currentScheduleActions[day] = {}
                        } else return;
                    } else if (time === "ALL_DAY" && Object.keys(currentScheduleActions[day]).length > 0) {
                        // If all day is already set, then continue, else, ask to overwrite
                        if (!currentScheduleActions[day]["ALL_DAY"]) {
                            if (confirm("Some actions are already specified for this day, overwrite?")) {
                                currentScheduleActions[day] = {}
                            } else return;
                        }
                    }


                    // if currentScheduleActions[day][getPassedTime(Object.keys(currentScheduleActions[day]), time)]'s redirect_to and after_expiry are the same as the new ones, then alert
                    if (Object.keys(currentScheduleActions[day]).length > 0 && Object.keys(currentScheduleActions[day])[0] !== "ALL_DAY") {
                        if (JSON.stringify(currentScheduleActions[day][getPassedTime(Object.keys(currentScheduleActions[day]), time)]) == JSON.stringify({redirect_to, ...additional})) {
                            if (!confirm("This action is not necessary, as it is the same as the time before, continue?")) return;
                        }
                    }

                    currentScheduleActions[day][time] = {
                      redirect_to,
                        ...additional
                    };
                    console.log(currentScheduleActions);
                    setCurrentScheduleActions(currentScheduleActions);
                    window.dispatchEvent(new Event('refreshScheduleList'));

                  }}
                  style={{
                    border: '1px black solid',
                    padding: '0px 10px',
                    borderRadius: 8,
                    background: '#ddd'
                  }}
                >
                  Add
                </button>
              </div>
              <div id="timezoneSelector" style={{
                border: "0px solid black",
                paddingBottom: 10,
                paddingTop: 20,
                borderRadius: 8
              }}>
                <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Timezone</b></p>
                <select
                  id="scheduletimezone"
                  className="disabled:bg-neutral-400"
                  style={{
                    border: "1px black solid",
                    borderRadius: 8,
                    textAlign: "center",
                    width: 300,
                }}
                defaultValue={moment.tz.guess()}
                >
                    {
                        moment.tz.names().filter((name)=>(name.includes("/") && !name.toLowerCase().startsWith("etc")) ).map((name)=>{
                            return <option key={name.toLowerCase().replace(/\//g,"_")} value={name}>{name}</option>
                        })
                    }
                </select>

            </div>
            </div>
            <div id="locationContainer" style={{ display: "none",  }}>
                <Location/>
            </div>
          </div>
        </div>
      </>
    );
}