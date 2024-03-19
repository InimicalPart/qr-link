"use client"

import { useEffect, useMemo, useRef, useState } from "react"


import { Chart } from "chart.js/auto"
import 'chartjs-adapter-moment';
import moment from "moment-timezone";


//! const data = (await global.QRCodeTable[params.id].getStatistics({
//!     type:"ScannedTimeRank",
//!     time:null,
//!     timezone: moment.tz.guess(),
//! }) as {
//!     info:{
//!         [key:string]:number
//!     },
//!     important_moments: {
//!         date: string, update: any
//!     }[]
//! })

let sortedAlpha: {
    [key:string]:number
} = {};
export default function TimeRank({data}: {
    data:{
        info: {
            [key:string]:number
        },
        important_moments: {
            date: string, update: {
                created?: string,
                [key: string]: any
            }
        }[]
    }
}) {

    let scanTime = useRef<HTMLCanvasElement>(null)
    let [finishedLoading, setFinishedLoading] = useState(false);

    /*
        {
            info: { "00:00": 23, ... },
            important_moments: [ { date: '2023-01-01T12:34:56.789Z', update: { created: '2023-01-01T12:34:56.789Z' } } ]
        }
    */

    const maxDataHeight = Math.max(...Object.values(data.info));
    const rounded = Math.round(maxDataHeight + (maxDataHeight * 0.1));



        
    useEffect(()=>{
        const zoomPlugin = require('chartjs-plugin-zoom');
        Chart.register(zoomPlugin.default);
    },[])

    useEffect(()=>{

        // the time in the data is in UTC, so we need to convert it to the user's timezone, and making it 12h format if the user's location prefers it
        const wants12H = Intl.DateTimeFormat(navigator.language,  { hour: 'numeric' }).resolvedOptions().hour12
        const is12H = Object.keys(data.info).find((a)=>a.includes("AM") || a.includes("PM"))
        for (let key in data.info) {
            let time = key
            if (is12H) time = moment(time, "hh:mm A").format("HH:mm")
            const convertedToTZ = new Date("1970-01-02T" + time + ":00Z").toLocaleTimeString(navigator.language, {hour: 'numeric', minute:'2-digit', hour12: wants12H})
            sortedAlpha[convertedToTZ] = data.info[key];
        }

        if (Object.keys(sortedAlpha).length>0) {

            let topHour = Object.keys(sortedAlpha).reduce((a, b)=>sortedAlpha[a] > sortedAlpha[b] ? a : b)
            let topHourCount = sortedAlpha[topHour]
            
            document.getElementById("topTime").innerText = `${topHour} (${topHourCount})`
        }
            
        sortedAlpha = Object.keys(sortedAlpha).sort((a, b) => {
            const timeA = moment(a, "hh:mm A");
            const timeB = moment(b, "hh:mm A");
            return timeA.diff(timeB);
        }).reduce((acc, key)=>{
            acc[key] = sortedAlpha[key];
            return acc;
        }, {} as {[key:string]:number})

    },[data.info])
    
    useEffect(()=>{
        // bar
        let chart: Chart<"bar", number[], string> = null
        if (scanTime.current && Object.keys(data.info).length > 0) {
            let ctx = scanTime.current.getContext('2d');
            if (ctx) {
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(sortedAlpha).map((a)=>a[0].toUpperCase() + a.slice(1)),
                        datasets: [{
                            label: 'Count',
                            data: Object.values(sortedAlpha),
                            backgroundColor: [
                                'rgba(54, 132, 235, 1)',
                            ],
                            borderColor: [
                                'rgba(54, 132, 235, 1)',
                            ],
                            borderWidth: 1
                        }],
                        
                    },
                    options: {
                        devicePixelRatio: 2,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                },
                                max: rounded
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            zoom: {
                                pan: {
                                    enabled: true,
                                    mode: 'x'
                                },
                                zoom: {
                                    wheel: {
                                        enabled: true,
                                    },
                                    pinch: {
                                        enabled: true
                                    },
                                    mode: 'x'
                                }
                            }
                        } as any
                    }
                });
            }
        }
        setFinishedLoading(true);
        return ()=>{
            if (chart) {
                chart.destroy();
            }
        }

    }, [data, rounded])

    return Object.keys(data.info).length > 0 ?
        <>
            <p hidden={!!finishedLoading} style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}>
                Graphing your data... 🛠
            </p>
            <canvas ref={scanTime}></canvas>
        </> :
        <p style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}>
            <i>No data available</i>
        </p>
}
