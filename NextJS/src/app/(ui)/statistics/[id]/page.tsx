import { StatisticsPage } from "@/components/statistics/statistics.client";

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



    return <></> // TODO: delete later
    // return <StatisticsPage params={params} data={} graphType="line" />
}