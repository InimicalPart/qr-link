"use client"

import { useEffect, useRef, useState } from "react"


import { Chart } from "chart.js/auto"
import 'chartjs-adapter-moment';


//! const data = (await global.QRCodeTable[params.id].getStatistics({
//!     type:"Browser",
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


export default function BrowserBar({data}: {
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

    let scanBrowsers = useRef<HTMLCanvasElement>(null)
    let [finishedLoading, setFinishedLoading] = useState(false);

    /*
        {
            info: { Firefox: 300, ... },
            important_moments: [ { date: '2023-01-01T12:34:56.789Z', update: { created: '2023-01-01T12:34:56.789Z' } } ]
        }
    */

    const maxDataHeight = Math.max(...Object.values(data.info));
    const rounded = Math.round(maxDataHeight + (maxDataHeight * 0.1));

    const sortedByOccurance = Object.keys(data.info).sort((a,b)=>data.info[b]-data.info[a]).reduce((acc, key)=>{
        acc[key] = data.info[key];
        return acc;
    }, {} as {[key:string]:number})
    
    useEffect(()=>{
        const zoomPlugin = require('chartjs-plugin-zoom');
        Chart.register(zoomPlugin.default);
    },[])

    useEffect(()=>{
        // bar
        let chart: Chart<"bar", number[], string> = null
        if (scanBrowsers.current && Object.keys(data.info).length>0) {
            let ctx = scanBrowsers.current.getContext('2d');
            if (ctx) {
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(sortedByOccurance),
                        datasets: [{
                            label: 'Count',
                            data: Object.values(sortedByOccurance),
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
        return () => {
            if (chart) {
                chart.destroy();
            }
        }

    }, [data,rounded, sortedByOccurance])

    return Object.keys(data.info).length > 0 ?
    <>
        <p hidden={!!finishedLoading} style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}>
            Graphing your data... 🛠
        </p>
        <canvas ref={scanBrowsers}></canvas>
    </> :
    <p style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}} title={"For information about browsers to show up, make sure your QRLink-code's action is set to 'user-agent' or that you have 'grab user-agent' enabled in your scan data settings. Users may also deny giving you information about their browser if 'require user-agent' isn't turned on, which might be why there is nothing here."}>
        <i>No data available</i>
    </p>
}
