"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Chart } from "chart.js"
import 'chartjs-adapter-moment';



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


export default function TimestampGraph({data}: {
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
    }
}) {

    let scanTimestamp = useRef<HTMLCanvasElement>(null)
    let [finishedLoading, setFinishedLoading] = useState(false);

    useEffect(()=>{
        const zoomPlugin = require('chartjs-plugin-zoom');
        Chart.register(zoomPlugin.default);
    },[])

    useEffect(()=>{
        let chart: Chart<"line", number[], string> = null;
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
    
    
            
            //fill empty with grouped
            for (let scan of grouped) {
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

            


            const maxDataHeight = Math.max(...b.map(d => d.count));
                const rounded = Math.round(maxDataHeight + (maxDataHeight * 0.5));
            chart = new Chart(scanTimestamp.current, {
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
                    devicePixelRatio: 2,
                    maintainAspectRatio: false,
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
                            type: 'time',
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
                }as any
            })
        }
        setFinishedLoading(true);
        return () => {
            if (chart) {
                chart.destroy();
            }
        }
    }, [data.info.length, data.important_moments, data.info])
    



    return data.info.length > 0 ?
    <>
        <p hidden={!!finishedLoading} style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}>
            Graphing your data... 🛠
        </p>
        <canvas ref={scanTimestamp}></canvas>
    </> :
    <p style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}>
        <i>No data available</i>
    </p>
}