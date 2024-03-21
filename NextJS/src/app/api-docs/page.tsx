import SwaggerUIClient from "./swagger"
import fs from "fs/promises"

export default async function SwaggerAPIDocs() {

    //! Read OpenAPI specs found at ./openapi.json
    const res = JSON.parse((await fs.readFile("./openapi.json")).toString())


    //! Make the current server appear in the server list as "This server"
    //! Add the current server to the list of servers if it doesn't exist already
    if (res.servers.some((server:any) => server.url === process.env.BASE_URL)) {
        let thisServer = res.servers.find((server:any) => server.url === process.env.BASE_URL)
        thisServer.description = "This server"

        //! Make this server appear first in the list (causing it to be the default)
        res.servers = res.servers.filter((server:any) => server.url !== process.env.BASE_URL)
        res.servers.unshift(thisServer)
    } else {
        //! Make this server appear first in the list (causing it to be the default)
        res.servers.unshift({
            url: process.env.BASE_URL,
            description: "This server"
        })
    }


    return <SwaggerUIClient spec={res}/>
}