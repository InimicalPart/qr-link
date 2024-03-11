"use client"
import React, { PureComponent } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function SmallStat({
    data,
    width=300,
    height=100,
    dataKey="count",
    className
}:{
    data: {timestamp: string|Date, count?: number}[],
    width?: number,
    height?: number,
    dataKey?: string,
    className?: string
}) {

    if (!data) return <></>

    data=data.map(a=>{
        return {
            ...a,
            timestamp: new Date(a.timestamp)
        }
    })


    function getScanCountAtDay(day: Date) {
        day = new Date(day.setHours(0,0,0,0));
        return data.map((a: any)=>new Date(a.timestamp.setHours(0,0,0,0))).filter((a: { getTime: () => number; })=>a.getTime() == day.getTime()).length;
    }
    function removeSameDay(scandata:{timestamp:Date}[]) {
        let seen = new Set();
        return scandata.filter(item => {
            let day = new Date(item.timestamp.setHours(0,0,0,0));
            return seen.has(day) ? false : seen.add(day);
        });

    }

    function fillWithZeros() {
        // for every day between the first and last day, if it's not in the scanData, add it with '0' scans
        let firstDay = new Date(new Date().setMonth(new Date().getMonth()-2));
        let lastDay = new Date();

        let days = [];
        for (let day = firstDay; day <= lastDay; day.setDate(day.getDate() + 1)) {
            days.push(new Date(day));
        }

        let result = [];
        for (let day of days) {
            let scanCount = getScanCountAtDay(day);
            result.push({timestamp: day, count: scanCount});
        }
        return result;
    }


    data = removeSameDay(data as {
        timestamp: Date;
        count: number;
    }[]);
    data = fillWithZeros();

    return (
    //   <ResponsiveContainer width={width} height={height} >
        
        <LineChart
          width={width}
          height={height}
          data={data}
          className={className}
        >
            <defs>
                <linearGradient
                    id="linear"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop offset="0%" stopColor="#00dd00" />
                    <stop offset="90%" stopColor="#003300" />
                </linearGradient>
            </defs>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={data.filter(a=>a.count).length > 0 ? "url(#linear)" : "#003300"}
            
            strokeWidth={2}
            
            dot={false}
          />
        </LineChart>
    //   </ResponsiveContainer>
    );
  }