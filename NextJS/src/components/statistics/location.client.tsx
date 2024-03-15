"use client";
import L, { DivIcon, LatLngTuple } from "leaflet";
import { useEffect } from "react";
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


export default function ScanLocation({data, showRadii=false, width = 600, height = 400}: {
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

    },
    width?: number,
    height?: number,
    showRadii?: boolean
}) {
    const colors = ["blue", "red", "green", "yellow", "purple", "orange"]; // Add more colors if needed

    console.log(data)
    
    function SizeInvalidator() {
        const map = useMap();
        useEffect(() => {
            console.log("invalidateSize")
            map.invalidateSize();
        }, []);
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
        }, []);
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
                    key={i}  
                    position={[info.latitude, info.longitude]}
                    icon={circleIcon}
                    zIndexOffset={-1000}
                >
                    {!showRadii ? infoPopup : null}
                </Marker>
            {showRadii ? 
                <Circle key={i} center={[info.latitude, info.longitude]} pathOptions={{ color: 'blue', weight:0}} radius={info.accuracy}>
                    {infoPopup}
                </Circle> : null}
            </>
        }) 
    }

    return (
        <React.Fragment>
            <div>
                <MapContainer maxBounds={[[-85.05115, -180], [85, 180]]} maxBoundsViscosity={1.0} style={{ width, height }} center={[51.505, -0.09]} zoom={2} minZoom={2} >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <SizeInvalidator/>
                    <ZoneManager/>
                    <PointsMapper />
                </MapContainer>
            </div>
        </React.Fragment>
    );
}