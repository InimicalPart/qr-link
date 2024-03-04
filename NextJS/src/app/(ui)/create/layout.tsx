import Script from "next/script"
import "leaflet/leaflet.css";


export default function UICreateLayout({
    children
}:{
    children: React.ReactNode
}) {
    return (
        <>
            <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></Script>
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.js"></Script>
            {/* <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet.locatecontrol/dist/L.Control.Locate.min.css" />
            <Script src="https://cdn.jsdelivr.net/npm/leaflet.locatecontrol/dist/L.Control.Locate.min.js"></Script> */}
            {children}
        </>
    )
}