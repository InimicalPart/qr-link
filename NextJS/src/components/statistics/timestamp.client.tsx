"use client"

import { useCallback, useEffect, useRef } from "react"


import { Chart } from "chart.js/auto"
import 'chartjs-adapter-moment';
import zoomPlugin from 'chartjs-plugin-zoom';

//! const data = (await global.QRCodeTable[params.id].getStatistics({
//!     type:"Scanned",
//!     time:null,
//!     timezone: moment.tz.guess(),
//!     onlyFields:"timestamp"
//! }) as {
//!     info:{
//!         [key:string]:number
//!     },
//!     important_moments: {
//!         date: string, update: any
//!     }[]
//! })


export default function TimestampGraph({data, width = 600, height = 100}: {
    data:{
        info: {
           timestamp: string,
            count: number 
        }[],
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

    let scanTimestamp = useRef<HTMLCanvasElement>(null)

    useEffect(()=>{

        function makeEmptyDataset() {
            // for every day between the first and last day, if it's not in the scanData, add it with '0' scans
            let firstDay = new Date(
                new Date(data.important_moments.find((a:any)=>a.update.created).update.created).setUTCHours(0,0,0,0));
            let lastDay = new Date();
    
            let days = [];
            for (let day = firstDay; day <= lastDay; day.setDate(day.getDate() + 1)) {
                if (day.getUTCHours() == 23) day.setUTCHours(day.getUTCHours() + 1);
                if (day.getUTCHours() == 1) day.setUTCHours(day.getUTCHours() - 1);
                days.push(new Date(day));
            }
    
            let result = [];
            for (let day of days) {
                result.push({timestamp: day.toISOString(), count: 0});
            }
            return result;
        }
    
        function groupSameDayScans() {
            // make it so that the scans that happen on the same day are grouped together into one day with the sum of the scan counts
            let result = [];
            let seen = new Set();
            for (let scan of data.info) {
                let day = new Date(new Date(scan.timestamp).setUTCHours(0,0,0,0)).toISOString();
                if (seen.has(day)) {
                    let index = result.findIndex(a=>a.timestamp == day);
                    result[index].count += 1;
                } else {
                    result.push({timestamp: day, count: 1});
                    seen.add(day);
                }
            }
            return result;
        }
    
        function parseDataSet() {
            let empty = makeEmptyDataset();
            let grouped = groupSameDayScans();
    
            console.log(empty, grouped)
    
            
            //fill empty with grouped
            for (let scan of grouped) {
                console.log(scan.timestamp, empty[0].timestamp)
                let index = empty.findIndex(a=>a.timestamp == scan.timestamp);
                empty[index].count = scan.count;
            }
            return empty;
    
        }

        if (scanTimestamp.current && data.info.length > 0) {
            const b = parseDataSet().toSorted(
                    (a: any, b: any) => {
                        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    })

            

                    
            Chart.register(zoomPlugin);

            const maxDataHeight = Math.max(...b.map(d => d.count));
                const rounded = Math.round(maxDataHeight + (maxDataHeight * 0.5));
            new Chart(scanTimestamp.current, {
                type: "line",
                data: {
                    labels: b.map(a => a?.timestamp?.split('T')[0] ?? a.timestamp),
                    datasets: [{
                        label: "Scans",
                        data: b.map(a => Math.floor(a.count)), // Remove decimal points
                        fill: false,
                        borderColor: "rgb(0,0,0)",
                        tension: 0.1
                    }]
                },
                options: {
                    plugins: {
                        zoom: {
                            pan: {
                                enabled: true,
                                mode: "x"
                            },
                            limits: {
                                x: {
                                    min: 'original',
                                    max: 'original'
                                },
                                y: {
                                    min: 'original',
                                    max: 'original'
                                }
                            },
                            zoom: {
                                mode: "x",
                                wheel: {
                                    enabled: true,
                                },
                                pinch: {
                                    enabled: true
                                }
                            }
                        },
                    },
                    scales: {
                        x: {
                            type: "time",
                            time: {
                                unit: "day",
                                tooltipFormat:'MM/DD/YYYY', // <- HERE
                            }
                        },
                        y: {
                            max: rounded, 
                            ticks: {
                                precision: 0
                            }
                      },
                        
                    },
                }
            })
        }
    }, [data.info.length, data.important_moments, data.info])
    
    console.log(data.important_moments)



    return <div style={{width, height}}>{data.info.length>0?<canvas ref={scanTimestamp}></canvas>:<p style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}><i>No data available</i></p>}</div>
}