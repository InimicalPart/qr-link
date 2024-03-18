"use client";
import L, { DivIcon, LatLngTuple } from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap} from 'react-leaflet'
import React from "react";


//! const data = (await global.QRCodeTable[params.id].getStatistics({
//!     type:"ScannedWhere",
//!     time:null,
//!     timezone: moment.tz.guess(),
//! }) as {
//!     info:{
//!         [key:string]:number
//!     },
//!     important_moments: {
//!         date: string, update: any
//!     }[]
//! })


export default function ScanLocation({data, showRadii=false}: {
    data:{
        info: {
            timestamp: string,
            latitude: number,
            longitude: number,
            accuracy: number
            browser?: string,
            os?: string,
        }[],
        important_moments: {
            date: string, update: {
                created?: string,
                [key: string]: any
            }
        }[],
        zones?: {
            type: "circle" | "polygon",
            center?: LatLngTuple,
            radius?: number,
            positions?: LatLngTuple[]
        }[]

    }
    showRadii?: boolean
}) {
    const colors = ["blue", "red", "green", "yellow", "purple", "orange"]; // Add more colors if needed
    const [showAccuracy, setShowAccuracy] = useState(showRadii)
    let [finishedLoading, setFinishedLoading] = useState(false);
    
    function SizeInvalidator() {
        const map = useMap();
        useEffect(() => {
            console.log("invalidateSize")
            map.invalidateSize();
        }, [map]);
        return <></>;
    }


    function ZoneManager() {
        const map = useMap();
        useEffect(() => {
            if (data.zones) {
            data.zones.forEach((zone, index) => {
                if (zone.type == "circle") {
                    new L.Circle(zone.center as LatLngTuple, {radius: zone.radius as number, color: colors[index % colors.length]}).addTo(map);
                } else if (zone.type == "polygon") {
                    new L.Polygon(zone.positions as LatLngTuple[], {color: colors[index % colors.length]}).addTo(map);
                }
            })
            }
        }, [map]);
        return <></>;
    }

function PointsMapper() {
    const circleIcon = new DivIcon({
        className: 'custom-icon',
        html: '<div style="width: 5px; height: 5px; background: blue; border-radius: 50%;"></div>',
        iconSize: [10, 10]
    });
    return data.info.map((info, i) => {
            
            
            const infoPopup =
                <Popup>
                    <span><b>{new Date(info.timestamp).toLocaleString()}</b></span>
                    <br/>
                    <span>Accuracy: {info.accuracy}m</span>
                    <br/>
                    {
                        info.os ? <><br/><span>OS: {info.os}</span></> : null
                    }
                    {
                        info.browser ? <><br/><span>Browser: {info.browser}</span></> : null
                    }
                </Popup>

            return <>
                <Marker 
                    key={info.latitude + "_" + info.longitude + "_" + info.accuracy} 
                    position={[info.latitude, info.longitude]}
                    icon={circleIcon}
                    zIndexOffset={-1000}
                >
                    <div hidden={!showAccuracy}>
                        {infoPopup}
                    </div>
                </Marker>
                <Circle key={info.latitude + "_" + info.longitude + "_" + info.accuracy+"_2"} center={[info.latitude, info.longitude]} pathOptions={{ color: 'blue', weight:0}} radius={showAccuracy?info.accuracy:0}>
                    {infoPopup}
                </Circle>
            </>
        }) 
    }

    return (
        data.info.length > 0 ?
        <>
            <p hidden={!!finishedLoading} style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}}>
                Plotting your data... 🛠
            </p>
            <React.Fragment>
                    <MapContainer whenReady={()=>setFinishedLoading(true)} maxBounds={[[-85.05115, -180], [85, 180]]} maxBoundsViscosity={1.0} style={{ width:"100%", height:"calc(100% - 36px)" }} center={[51.505, -0.09]} zoom={2} minZoom={2} >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                        <SizeInvalidator/>
                        <ZoneManager/>
                        <PointsMapper />
                    </MapContainer>
                    <button hidden={!finishedLoading} style={{
                        left:"50%",
                        transform:"translateX(-50%)",
                        position:"relative",
                        marginTop:10,
                        padding:"5px 10px",
                        border:"1px solid black",
                        borderRadius:10
                    }}
                    onClick={()=>setShowAccuracy(!showAccuracy)}
                    >
                        {showAccuracy ? "Hide" : "Show"} Accuracy Radii
                    </button>
            </React.Fragment>
        </> : 
        <p style={{color:"gray", width:"fit-content", position:"relative", left: "50%", top: "50%", transform: "translate(-50%,-50%)"}} title={"For information about where the users scanned your code to show up, make sure your QRLink-code's action is set to 'location' or that you have 'grab location' enabled in your scan data settings. Users may also deny giving you information about where they are if 'require location' isn't turned on, which might be why there is nothing here."}>
            <i>No data available</i>
        </p>
    );
}