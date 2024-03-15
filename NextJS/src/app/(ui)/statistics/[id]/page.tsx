import { QRLinkGlobal } from "@/types/api/v1/global";
import TimeRank from "@/components/statistics/timerank.client";
import moment from "moment-timezone";
import "leaflet/leaflet.css";

import { notFound } from "next/navigation";

declare const global: QRLinkGlobal

export default async function Statistics({params}: {params:{id:string}}) {

    if (process.env.NODE_ENV === "production") {
        return notFound()
    }

    const data = (await global.QRCodeTable[params.id].getStatistics({
        type:"ScannedTimeRank12H",
        time:null,
        timezone: moment.tz.guess(),
    }) as {
        info:{
            [key:string]:number
        },
        important_moments: {
            date: string, update: any
        }[]
    })

    return <TimeRank data={data}/>
}