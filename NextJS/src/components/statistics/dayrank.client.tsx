"use client"

import { useEffect, useRef } from "react"


import { Chart } from "chart.js/auto"
import 'chartjs-adapter-moment';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

//! const data = (await global.QRCodeTable[params.id].getStatistics({
//!     type:"ScannedDayRank",
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

    let scanDay = useRef<HTMLCanvasElement>(null)

    console.log(data)
    /*
        {
            info: { monday: 46, tuesday: 19, ... },
            important_moments: [ { date: '2023-01-01T12:34:56.789Z', update: { created: '2023-01-01T12:34:56.789Z' } } ]
        }
    */

    const maxDataHeight = Math.max(...Object.values(data.info));
    const rounded = Math.round(maxDataHeight + (maxDataHeight * 0.1));

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const sortedByOccurance = days.reduce((acc, key)=>{
        acc[key] = data.info[key] || 0;
        return acc;
    }, {} as {[key:string]:number})
    
    useEffect(()=>{
        // bar
        if (scanDay.current && Object.keys(data.info).length>0) {
            let ctx = scanDay.current.getContext('2d');
            if (ctx) {
                let chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(sortedByOccurance).map((a)=>a[0].toUpperCase() + a.slice(1)),
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
        
    }, [data, rounded, sortedByOccurance])

    return <div style={{width, height}}>{Object.keys(data.info).length>0?<canvas ref={scanDay}></canvas>:<p style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}><i>No data available</i></p>}</div>
}