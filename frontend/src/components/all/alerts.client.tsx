"use client";
import { useEffect } from "react";

export default function Alerts() {
    useEffect(()=>{
        function showAlert(message: string, type="NONE") {
            console.log("[ALERTS] Displaying alert: " + message + " of type " + type)
            let time = new Date().getTime()
            let color = ""
            let textColor = ""
            let intensity = ""
            switch (type) {
                case "info":
                    color = "blue"
                    textColor = "blue"
                    intensity = "500"
                    break;
                case "error":
                    color = "red"
                    textColor = "red"
                    intensity = "400"
                    break;
                case "success":
                    color = "green"
                    textColor = "green"
                    intensity = "600"
                    break;
                case "warning":
                    color = "yellow"
                    textColor = "yellow"
                    intensity = "600"
                    break;
                default:
                    color = "gray"
                    textColor = "gray"
                    intensity = "300"
                    break;
            }
            function _ignoreme(){
                // this is just to make TailwindCSS compile the required classes for the alert
                return <div>
                    <p className="bg-red-100 text-red-400 p-4 rounded-lg"></p>
                    <p className="bg-blue-100 text-blue-500 p-4 rounded-lg"></p>
                    <p className="bg-green-100 text-green-600 p-4 rounded-lg"></p>
                    <p className="bg-yellow-100 text-yellow-600 p-4 rounded-lg"></p>
                    <p className="bg-gray-100 text-gray-300 p-4 rounded-lg"></p>
                    <ul className="list-disc list-inside mt-1.5 ml-1.5"></ul>
                </div>
            }
            let template = `<div name="alert-${time}" class="alert pointer-events-none flex items-center p-4 mb-4 text-sm  rounded-lg bg-${color}-100   text-${textColor}-${intensity} h-fit fixed transition-[bottom,opacity] opacity-100 duration-300" style="bottom:-200px">
                <svg class="flex-shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
                </svg>
                <span class="sr-only">${type[0].toUpperCase() + type.substring(1)}</span>
                <div>
                    ${message}
                </div>
                </div>`
            document.getElementById("alerts").innerHTML += template
            setTimeout(() => {
                const ourAlert = document.querySelector(`[name="alert-${time}"]`);
                (ourAlert as HTMLDivElement).style.bottom = -(ourAlert as HTMLDivElement).offsetHeight - 10 + "px";
                // move all alerts up by 60px
                document.querySelectorAll(".alert").forEach((alert: Element) => {
                    // if current alert, move by 70px
                    if (alert.getAttribute("name") !== "alert-" + time) {
                    //     (alert as HTMLDivElement).style.bottom = "0px";
                    // } else {
                        (alert as HTMLDivElement).style.bottom = parseInt((alert as HTMLDivElement).style.bottom) + (alert as HTMLDivElement).offsetHeight + 10 + "px";
                    }
                });
                setTimeout(()=>{
        
                    (ourAlert as HTMLDivElement).style.bottom = "0px"
                    setTimeout(() => {
                        document.querySelectorAll(".alert").forEach((alert) => {
                            if (alert.getAttribute("name") == "alert-" + time) {
                            alert.classList.add("!opacity-0")
                            alert.classList.remove("opacity-100")
                            setTimeout(() => {
                                alert.remove()
                            }, 350)
                        }
                    })
                    //document.querySelectorAll(".alert").forEach((alert) => {
                        //    alert.style.bottom = parseInt(alert.style.bottom) - 60 + "px"
                        //})
                    }, 5000)
                },100)
                }, 10)
        }
        (window as unknown as any).showAlert = showAlert
    },[])

    return <div id="alerts" style={{zIndex:1000}} className="w-full h-full absolute bottom-0 left-0 items-end flex justify-center pointer-events-none"></div>
}