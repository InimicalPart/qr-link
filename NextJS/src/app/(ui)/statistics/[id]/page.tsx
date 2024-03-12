import { StatisticsPage } from "@/components/statistics/statistics.client";
import { QRLinkGlobal } from "@/types/api/v1/global";
import moment from "moment-timezone";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1"

declare const global: QRLinkGlobal


export async function generateMetadata(
    { params}: {
        params: { id: string }
    },
    parent: ResolvingMetadata
  ): Promise<Metadata> {
    
    //TODO: REMOVE
    if (process.env.NODE_ENV == "production") {
        return notFound()
    }

    // read route params
    const id = params.id

    return {
      title: "Statistics for QRLink with ID " + id,
    }
  }

export default async function Statistics({
    params
}:{
    params: {
        id: string
    }
}) {

    //TODO: REMOVE
    if (process.env.NODE_ENV == "production") {
        return notFound()
    }



    // const response = await fetch(`${API_URL}/qrcode/${params.id}/statistics?

    // return <></> // TODO: delete later

    console.log(moment.tz.guess())
    const data = (await global.QRCodeTable[params.id].getStatistics({type:"Scanned", time:null, timezone: moment.tz.guess(), onlyFields:"timestamp"}) as {info:{[key:string]:number}, important_moments: {date: Date, update: any}[]})
    return <StatisticsPage params={params} data={
        {
            scanData: data.info,
            important_moments: data.important_moments.map(a=>{
                return {
                    timestamp: a.date,
                    update: a.update
                }
            })
        }


    } statisticsType="timestamp" />
}