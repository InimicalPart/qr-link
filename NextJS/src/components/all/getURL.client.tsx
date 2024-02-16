"use client";

import { useEffect } from "react";

export default function GetURL({setURL}: {setURL: any}) {
    useEffect(()=>{

        document.getElementById("url").setAttribute("value", window.location.href);
        (document.getElementById("url") as any).form?.requestSubmit()
    })
    return <form action={setURL}>
        <input hidden={true} type="text" name="url" id="url" />
    </form>
}