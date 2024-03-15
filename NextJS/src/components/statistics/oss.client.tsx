"use client"

import { useEffect, useRef } from "react"


import { Chart } from "chart.js/auto"
import 'chartjs-adapter-moment';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

//! const data = (await global.QRCodeTable[params.id].getStatistics({
//!     type:"OS",
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


export default function StatisticsPage({data, width = 600, height = 300}: {
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
    },
    width?: number,
    height?: number
}) {

    let scanOSs = useRef<HTMLCanvasElement>(null)

    console.log(data)
    /*
        {
            info: { Windows: 300, ... },
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
        // bar
        if (scanOSs.current && Object.keys(data.info).length>0) {
            let ctx = scanOSs.current.getContext('2d');
            if (ctx) {
                let chart = new Chart(ctx, {
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
                        }
                    }
                });
            }
        }
        
    }, [data,scanOSs.current])

    return <div style={{width, height}}>{Object.keys(data.info).length>0?<canvas ref={scanOSs}></canvas>:<p style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}><i>No data available</i></p>}</div>
}