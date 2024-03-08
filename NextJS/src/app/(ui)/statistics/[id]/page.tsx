import { StatisticsPage } from "@/components/statistics/statistics.client";
import { QRLinkGlobal } from "@/types/api/v1/global";
import moment from "moment-timezone";
import { Metadata, ResolvingMetadata } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1"

declare const global: QRLinkGlobal


export async function generateMetadata(
    { params}: {
        params: { id: string }
    },
    parent: ResolvingMetadata
  ): Promise<Metadata> {
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

    if (process.env.NODE_ENV === "production") {
        return <p>
            This page is not available in production mode.
        </p>
    }



    // const response = await fetch(`${API_URL}/qrcode/${params.id}/statistics?

    // return <></> // TODO: delete later

    console.log(moment.tz.guess())
    return <StatisticsPage params={params} data={
        {
            scanData: (await global.QRCodeTable[params.id].getStatistics("OS",null, moment.tz.guess()) as {info:{[key:string]:number}}).info,
            important_moments: global.QRCodeTable[params.id].getImportantMoments(global.QRCodeTable[params.id].created, new Date()).map(a=>{
                return {
                    timestamp: a.date,
                    update: a.update
                }
            })
        }


    } statisticsType="OS" />
}