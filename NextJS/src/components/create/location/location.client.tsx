"use client";
import L, { DivIcon, LatLng, LatLngTuple } from "leaflet";
import { useCallback, useEffect, useState } from "react";
import { useLeafletContext } from '@react-leaflet/core'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents, Tooltip, CircleMarker, Polyline, Polygon } from 'react-leaflet'
import { intersect as intersects, contains } from "@/utilities/(ui)/create/shapeOperations.server";
import crypto from 'crypto'
import { LocateControl } from "./locateControl.client";
import React from "react";
export default function Location({
    state,
    qrCodeInfo = {},
    action
}: {
    state: any,
    qrCodeInfo?: any,
    action: string
}) {
    const [zones, setZones] = useState([] as any[]);
    const [selectedZoneIndex, setSelectedZoneIndex] = useState(-1);
    const [isCreatingZone, setIsCreatingZone] = useState(false);
    const [zoneType, setZoneType] = useState("circle"); // "circle" or "polygon"
    const [polygonPositions, setPolygonPositions] = useState([] as LatLngTuple[]); // The positions of the polygon's vertices [lat, lng
    const colors = ["blue", "red", "green", "yellow", "purple", "orange"]; // Add more colors if needed
    const [verifiying, setVerifying] = useState(false)
    const [leafletMap, setMap] = useState(null)

    const wrappedValidateLocation = useCallback(validateLocation, [])

    
    useEffect(()=>{
        function getData() {
            if (action == "location") {
                window.dispatchEvent(new CustomEvent("data", { detail: { zones: convertToBeautiful(zones) } }));
            }
        }
        window.addEventListener("getData", getData)

        return ()=>{
            window.removeEventListener("getData", getData)
        }
    },[zones,action])

    // process existing zones in qrCodeInfo.data.zones ([]) if qrCodeInfo.type == "location"
    useEffect(()=>{
        if (qrCodeInfo.type == "location") {
            setZones(qrCodeInfo.data.zones.map((zone: any) => {
                return {
                    ...zone,
                    ...(zone.center?{positions:[zone.center]}:{}),
                    hidden: false,
                    key: crypto.randomBytes(32).toString("hex")
                }
            }))
        }
    },[qrCodeInfo])

    useEffect(()=>{
        function onSubmit(e: Event) {
            if (action == "location") {
                if (!validateLocation(zones)) {
                    console.log("Cancelling form submission due to invalid location zones being present")
                    e.preventDefault()
                }
            }
        }
        document.getElementById("create-form")?.addEventListener("submit", onSubmit);
        return ()=>{
            document.getElementById("create-form")?.removeEventListener("submit", onSubmit);
        }
    })

    function convertToBeautiful(zones: any, includeFunctions = false): {
        type: 'polygon';
        priority: number;
        isEntireWorld: boolean;
        positions: LatLngTuple[];
        redirectTo: string;
        afterExpiry: string;
    }| {
        type: 'circle';
        priority: number;
        isEntireWorld: boolean;
        center: LatLngTuple;
        radius: number;
        redirectTo: string;
        afterExpiry: string;
    } | string {
        const res = zones.map((zone: any) => {
            const newZone: {
                type: 'circle' | 'polygon';
                priority: number;
                isEntireWorld: boolean;
                positions?: LatLngTuple[];
                center?: LatLngTuple;
                radius?: number;
                redirectTo: string;
                afterExpiry: string;
            } = {
                type: zone.type,
                priority: zone.priority,
                isEntireWorld: zone.isEntireWorld || false,
                redirectTo: zone.redirectTo,
                afterExpiry: zone.afterExpiry
            };
            if (zone.type === "circle") {
                newZone.center = zone.positions[0];
                newZone.radius = zone.radius;
            } else {
                newZone.positions = zone.positions;
            }

            return newZone;
        })
        return includeFunctions ? res : JSON.stringify(res)
    }

    let flyToZoneWithIndex = flyToZone.bind(null, selectedZoneIndex);

    const handleMapClick = (e: any) => {
        if (verifiying) return;
        if (isCreatingZone) {
            if (zoneType == "circle") {
                createCircleZone(e);
                setSelectedZoneIndex(zones.length); // Set the newly created zone as the selected zone
                setIsCreatingZone(false);
            } else if (zoneType == "polygon") {
                if (polygonPositions.length > 100) {
                    alert("You cannot have more than 100 points in a polygon zone");
                    return;
                }
                setPolygonPositions([...polygonPositions, [e.latlng.lat, e.latlng.lng]]);
            } else if (zoneType == "entireWorld") {
                createEntireWorldZone();
                setSelectedZoneIndex(zones.length); // Set the newly created zone as the selected zone
                setIsCreatingZone(false);
                setZoneType("circle");
            }
        } else if (zones.length > 0) {
            if (selectedZoneIndex != -1 && zones[selectedZoneIndex].type == "circle") {
                const newZones = [...zones];
                newZones[selectedZoneIndex].positions[0] = [e.latlng.lat, e.latlng.lng];
                console.log(newZones[selectedZoneIndex].key)
                setZones(newZones);
            }
        }
    };
    const handleDeletePoint = (index: number) => {
        const newPoints = [...polygonPositions];
        newPoints.splice(index, 1);
        setPolygonPositions(newPoints);
    };
    const highlightPolygonPoint = (index: number) => {
        // find point with title "Point index"
        const points = document.querySelectorAll(".leaflet-marker-icon");
        (points[index] as any).children[0].style.background = colors[zones.length%colors.length] == "red" ? "blue" : "red";;
        // (points[index] as any).style.width = "15px";
        // (points[index] as any).style.height = "15px";
        (points[index] as any).style.borderRadius = "100%";
        // (points[index] as any).children[0].style.width = "15px";
        // (points[index] as any).children[0].style.height = "15px";
        (points[index] as any).children[0].style.borderRadius = "100%";
        
    } 
    const unHighlightPolygonPoint = (index: number) => {
        // find point with title "Point index"
        const points = document.querySelectorAll(".leaflet-marker-icon");
        (points[index] as any).children[0].style.background = colors[zones.length%colors.length];
        // (points[index] as any).style.width = "10px";
        // (points[index] as any).style.height = "10px";
        (points[index] as any).style.borderRadius = "100%";
        // (points[index] as any).children[0].style.width = "10px";
        // (points[index] as any).children[0].style.height = "10px";
        (points[index] as any).children[0].style.borderRadius = "100%";
    }
    const finishPolygonZone = () => {
        if (polygonPositions.length < 3) {
            alert("You need at least 3 points to create a polygon zone");
            return;
        }
        if (polygonPositions.length > 100) {
            alert("You cannot have more than 100 points in a polygon zone");
            return;
        }
        setIsCreatingZone(false);
        setZones([...zones, { positions: JSON.parse(JSON.stringify(polygonPositions)), type: "polygon", priority: 0, hidden:false, redirectTo: "", afterExpiry: "", key:crypto.randomBytes(32).toString("hex")}]);
        setSelectedZoneIndex(zones.length); // Set the newly created zone as the selected zone
        setPolygonPositions([]);
    }
    const createEntireWorldZone = () => {
        setZones([...zones, { positions: [[-85.05115, -180], [85, -180], [85, 180], [-85.05115, 180]], type: "polygon", hidden:false, isEntireWorld: true, redirectTo: "", afterExpiry: "", priority: -1000,key:crypto.randomBytes(32).toString("hex")}]);
        setZoneType("circle");
    };
    const createCircleZone = (e: any) => {
        setZones([...zones, { positions: [[e.latlng.lat, e.latlng.lng]], radius: 300, type: "circle", priority: 0, hidden:false, redirectTo: "", afterExpiry: "", key:crypto.randomBytes(32).toString("hex")}]);
        
    };
    const deactivateAllZones = () => {
        setSelectedZoneIndex(-1);
    };
    const handleRadiusChange = (e: any) => {
        let val = parseInt(e.target.value);
        if (zones.length > 0 && selectedZoneIndex != -1) {
            if (val < 10) val = 10;
            if (val > 1000000) val = 1000000;
            const newZones = [...zones];
            newZones[selectedZoneIndex].radius = val || 10;
            setZones(newZones);
        }
    };
    const handlePriorityChange = (e: any) => {
        let val = parseInt(e.target.value);
        if (zones.length > 0 && selectedZoneIndex != -1) {
            if (val < -999) val = -999;
            if (val > 1000) val = 1000;
            const newZones = [...zones];
            newZones[selectedZoneIndex].priority = val || 0;
            setZones(newZones);
        }
    };
    const deleteZone = (index: number) => {
        if (zones.length > 0) {
            const newZones = [...zones];
            zones[index].L.remove();
            newZones.splice(index, 1);
            setZones(newZones);
            setSelectedZoneIndex(-1);
        }
    }

    // useEffect(() => {
    //     (document.getElementById("radiusChange") as HTMLInputElement).value = zones.length > 0 && selectedZoneIndex != -1 && zones[selectedZoneIndex].radius ? zones[selectedZoneIndex].radius : 300;
    // }, [selectedZoneIndex]);
    function flyToZone(index: number, _e: any) {
        let map = zones[index].L._map as L.Map;
        if (!zones[index].isEntireWorld) {
            map.flyToBounds(zones[index].bounds, {
                duration:1,
                // maxZoom: 10
            });
        }
    }
    useEffect(()=>{
        window.addEventListener("verifyZones", verifyZones)
        function verifyZones() {
            setVerifying(true)
            console.log("Verifying")
            if (wrappedValidateLocation(zones)) {
                window.dispatchEvent(new CustomEvent("verifyResults", { detail: {
                    status: "success",
                } }))
            } else {
                window.dispatchEvent(new CustomEvent("verifyResults", { detail: {
                    status: "error",
                } }))
            }
            console.log("Done verifying")
            setVerifying(false)
        }
        return ()=>{
            window.removeEventListener("verifyZones", verifyZones)
        }    
    },[zones,wrappedValidateLocation])
    function validateLocation(zones:{
        type: 'circle' | 'polygon';
        priority?: number;
        isEntireWorld?: boolean;
        positions?: number[][] | number[];
        radius?: number;
        redirectTo: string;
        afterExpiry: string;
        bounds: L.LatLngBounds
    }[]) {
            if (zones.length < 1) {
                alert("You need at least 1 zone")
                return false
            }

            // at least 2 zones
            if (zones.length == 1 && zones[0].isEntireWorld) {
                alert("Your only zone cannot be the entire world, if you need to make it work everywhere, check out the 'Redirect' action.")
                return false
            }


            let intersections: [string, string][] = []
            for (let zoneIndex in zones) {
                for (let zoneIndex2 in zones) {
                    if (zoneIndex == zoneIndex2 || intersections.some((val)=>val.includes(zoneIndex) && val.includes(zoneIndex2))) continue;
                    if (intersects(JSON.parse(convertToBeautiful([zones[zoneIndex]]) as string)[0], JSON.parse(convertToBeautiful([zones[zoneIndex2]]) as string)[0])) {
                        intersections.push([zoneIndex, zoneIndex2]);
                    }
                }
            }
            console.log("These zones are intersecting:", intersections);
            // find the biggest zone in each intersection
            let problemZones = [];
            let insideAnother = [];
            for (let intersection of intersections) {
                let zone1 = zones[parseInt(intersection[0])];
                let zone2 = zones[parseInt(intersection[1])];
                if (
                    contains(JSON.parse(convertToBeautiful([zone1]) as string)[0], JSON.parse(convertToBeautiful([zone2]) as string)[0])
                ) {
                    insideAnother.push([zone1, zone2]);
                } else if (
                    contains(JSON.parse(convertToBeautiful([zone2]) as string)[0], JSON.parse(convertToBeautiful([zone1]) as string)[0])
                ) {
                    insideAnother.push([zone2, zone1]);
                } else {
                    problemZones.push([zone1, zone2]);
                }
            }
            console.log("Problem zones:", problemZones);

            // remove the ones that dont have the same priority
            let samePriority = [];
            for (let problemZone of problemZones) {
                if (problemZone[0].priority == problemZone[1].priority) {
                    samePriority.push(problemZone);
                }
            }
            if (samePriority.length > 0) {
                (window as unknown as any).showAlert(`     <span class="font-medium">Intersected zones with the same priority are not allowed. Please fix the following zones:</span>
                                <ul class="mt-1.5 ml-1.5 list-disc list-inside">
                                    ${samePriority
                                        .map((z) => {
                                            return [
                                                "<li>Zone " +
                                                (zones.indexOf(z[0]) + 1) +
                                                " <-> Zone " +
                                                (zones.indexOf(z[1]) + 1)
                                            +"</li>"];
                                        })
                                        .join("")}
                                </ul>`
                        ,"error")
                return false
            }

            let whatWasPlannedHere = [];
            for (let inside of insideAnother) {
                if (inside[0].priority > inside[1].priority) {
                    whatWasPlannedHere.push(inside);
                }
            }

            if (whatWasPlannedHere.length > 0) {
                (window as unknown as any).showAlert(`     <span class="font-medium">Some zones are inside a zone with higher priority than the zone inside, the zone inside will never be triggered. Please fix the following zones:</span>
                                <ul class="mt-1.5 ml-1.5 list-disc list-inside">
                                    ${whatWasPlannedHere
                                        .map((z) => {
                                            return [
                                                "<li>Zone " +
                                                (zones.indexOf(z[0]) + 1) +
                                                " is inside Zone " +
                                                (zones.indexOf(z[1]) + 1)
                                            +"</li>"];
                                        })
                                        .join("")}
                                </ul>`
                        ,"error")
                return false
            }



            let missingRedirects = [];
            for (let zone of zones) {
                if (zone.redirectTo == "") {
                    missingRedirects.push(zone);
                }
            }

            if (missingRedirects.length > 0) {
                (window as unknown as any).showAlert(`     <span class="font-medium">Some zones are missing the 'redirect to' property. Please fix the following zones:</span>
                                <ul class="mt-1.5 ml-1.5 list-disc list-inside">
                                    ${missingRedirects
                                        .map((z) => {
                                            return [
                                                "<li>Zone " +
                                                (zones.indexOf(z) + 1)
                                            +"</li>"];
                                        })
                                        .join("")}
                                </ul>`
                        ,"error")
                return false
            }

            // for each redirect_to and after_expiry, check if its valid using: !/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(redirect_to)
            let invalidRedirects = [];
            let invalidAfterExpiry = [];
            for (let zone of zones) {
                if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(zone.redirectTo)) {
                    invalidRedirects.push(zone);
                }
                if (zone.afterExpiry) {
                    if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(zone.afterExpiry)) {
                        invalidAfterExpiry.push(zone);
                    }
                }
            }

            if (invalidRedirects.length > 0) {
                (window as unknown as any).showAlert(`     <span class="font-medium">Some zones have invalid 'redirect to' properties. Please fix the following zones:</span>
                                <ul class="mt-1.5 ml-1.5 list-disc list-inside">
                                    ${invalidRedirects
                                        .map((z) => {
                                            return [
                                                "<li>Zone " +
                                                (zones.indexOf(z) + 1)
                                            +"</li>"];
                                        })
                                        .join("")}
                                </ul>`
                        ,"error")
                return false
            } else if (invalidAfterExpiry.length > 0) {
                (window as unknown as any).showAlert(`     <span class="font-medium">Some zones have invalid 'after expiry' properties. Please fix the following zones:</span>
                                <ul class="mt-1.5 ml-1.5 list-disc list-inside">
                                    ${invalidAfterExpiry
                                        .map((z) => {
                                            return [
                                                "<li>Zone " +
                                                (zones.indexOf(z) + 1)
                                            +"</li>"];
                                        })
                                        .join("")}
                                </ul>`
                        ,"error")
                return false
            }



            return true
        }

        function toggleView(index: number) {
            const zone = zones[index];
            console.log(leafletMap)
            console.log(zone.L._map)
            if (zone.L._map) {
                zone.L.removeFrom(leafletMap);
                zones[index].hidden = true;
                return;
            } else {
                zone.L.addTo(leafletMap);
                zones[index].hidden = false;
            }
        }

    function SizeInvalidator() {
        const context = useLeafletContext();
        const map = context.map

        useEffect(()=>{
            function onTypeChanged(event: any) {
                if (event.detail == "location") {
                    console.log("Invalidating size")
                    map.invalidateSize()
                }
            }
            window.addEventListener("typeChange", onTypeChanged)
            return ()=>{
                window.removeEventListener("typeChange", onTypeChanged)
            }
        },[map])

        useEffect(()=>{
            if (action == "location") {
                console.log("Invalidating size")
                map.invalidateSize()
            }
        },[map])

        return <></>
    }
    
    function LayerOrganizer({zones}: {zones: any[]}) {
        const context = useLeafletContext();

        useEffect(()=>{
            setMap(context.map);
        }, [context.map]);

        useEffect(()=>{
            if (leafletMap) {
                const copy = [...zones];
                for (let zone of copy.sort((a,b)=>b.priority - a.priority)) { 
                    zone.L.bringToFront();
                }
            }
        }, [zones]);

        return <></>;
    }

    useEffect(()=>{
        if (zones.length > 0 && selectedZoneIndex != -1) {
            (document.getElementById("radiusChange") as HTMLInputElement).value = zones.length > 0 && selectedZoneIndex != -1 && zones[selectedZoneIndex].radius ? zones[selectedZoneIndex].radius : 300;
            (document.getElementById("prio") as HTMLInputElement).value = zones[selectedZoneIndex]?.priority || 0;
            (document.getElementById("locRedirect") as HTMLInputElement).value = zones[selectedZoneIndex]?.redirectTo || "";
            (document.getElementById("locAERedirect") as HTMLInputElement).value = zones[selectedZoneIndex]?.afterExpiry || "";
        }
    },[selectedZoneIndex,zones])
    return (
        <React.Fragment>
            <div>
            <input className="create" type="hidden" name="location_zones" disabled={action !== "location"} value={convertToBeautiful(zones) as string} />
                <MapContainer maxBounds={[[-85.05115, -180], [85, 180]]} maxBoundsViscosity={1.0} style={{ width: "90vw", maxWidth: 600, height: 400, left:"50%", transform:"translateX(-50%)" }} center={zones.length > 0 && selectedZoneIndex >= 0 && selectedZoneIndex < zones.length ? zones[selectedZoneIndex].position : [51.505, -0.09]} zoom={2} minZoom={2} >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocateControl position="topleft" />
                    <ZoneController zones={zones} selectedZoneIndex={selectedZoneIndex} />
                    <PolygonPointsController points={polygonPositions} />
                    <SizeInvalidator/>
                    <LayerOrganizer zones={zones}/>
                </MapContainer>
                <p style={{
                    color: "darkgray",
                    fontSize: "10pt",
                    fontWeight: 500,
                    position:"absolute",
                    left:"50%",
                    transform:"translateX(-50%)",
                    width: "100%"
                }} hidden={!isCreatingZone}>{zoneType == "circle" ? "Click/Tap on the map to create a circle zone" : zoneType == "polygon" ? "Click/Tap on the map to place your "+(polygonPositions.length<1?"first":"next")+" polygon point" : "Click/Tap on the map to create a zone for the entire world"}</p>
                <br/>
            <button className="create" 
            type="button"
            style={{
                marginBottom:20,
                width: 250
            }} onClick={() => {
                if (isCreatingZone) {
                    setPolygonPositions([]);
                    setIsCreatingZone(false);
                } else {
                    setIsCreatingZone(true)
                }
            }}>
                    {isCreatingZone ? "Cancel" : "New Zone"}
                </button>
                <div hidden={!isCreatingZone} style={{
                    border: "1px solid black",
                    width:250,
                    paddingTop:10,
                    paddingBottom:15,
                    left:"50%",
                    transform: "translateX(-50%)",
                    position: "relative",
                    borderRadius: 8,
                    marginBottom:15
                }}>
                    <p  style={{
                        marginBottom:5
                    }}><b>Zone Type:</b></p>
                    <select className="create" value={zoneType} style={{ width:200}} onChange={(e) => setZoneType(e.target.value)}>
                        <option className="create" value="circle">Circle</option>
                        <option className="create" value="polygon">Polygon</option>
                        <option className="create" disabled={zones.some(a=>a.isEntireWorld)} hidden={zones.some(a=>a.isEntireWorld)} value="entireWorld">Entire World</option>
                    </select>
                    <button className="create"
                    type="button"
                    style={{
                        fontSize: "11pt",
                        height: 30,
                        marginTop: 20,
                        width: "200px",
                    }} hidden={
                    !isCreatingZone || zoneType != "polygon"
                } onClick={finishPolygonZone}>
                    Finish Polygon Zone
                </button>
                <p hidden={zones.length < 1 || selectedZoneIndex == -1 || zones[selectedZoneIndex]?.type != "polygon" || zones[selectedZoneIndex]?.isEntireWorld || !isCreatingZone } style={{
                        marginBottom:5,
                        marginTop:10
                    }}><b>Points:</b></p>
                <ul style={{textAlign:"center",marginTop:10}}>
                {polygonPositions.map((point, index) => (
                    <li key={"point-"+index} style={{cursor:"pointer", fontWeight:600, textDecoration:"underline"}} onMouseOver={()=>highlightPolygonPoint(index)} onMouseOut={()=>unHighlightPolygonPoint(index)} onClick={() => handleDeletePoint(index)}>Delete Point {index + 1}</li>
                ))}
                </ul>
                </div>
                <div hidden={selectedZoneIndex == -1 || zones.length < 1} style={{
                    border: "1px solid black",
                    borderRadius: 8,
                    paddingTop: 10,
                    paddingBottom:15,
                    width:250,
                    left: "50%",
                    position:"relative",
                    transform:"translateX(-50%)"
                }}>
                    {/* <hr style={{
                        height: 2,
                        background: "black",
                        width:400,
                        left: "50%",
                        transform:"translateX(-50%)",
                        position:"relative",
                        marginBottom:20
                    }}/> */}
                    <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                        marginBottom:20,
                        position:"relative"
                    }}>
                        <b >Zone Settings</b>
                        <span style={{
                            fontSize:"9pt",
                            flexBasis: "100%",
                            marginTop: -5,
                            fontWeight:500
                        }}>Zone {selectedZoneIndex+1} ({zones[selectedZoneIndex]?.isEntireWorld ? "World" : zones[selectedZoneIndex]?.type[0]?.toUpperCase() + zones[selectedZoneIndex]?.type?.slice(1)})</span>
                    </p>

                    
                    <p style={{
                        position:"relative",
                        fontSize:14
                    }} hidden={zones.length < 1 || selectedZoneIndex == -1 || zones[selectedZoneIndex].type != "circle"}
                    title="The radius (in meters) of the zone."><b>Radius (meters)</b></p>
                    <input className="create" id="radiusChange" style={{
                        position: "relative",
                        width:"90%"
                    }} hidden={zones.length < 1 || selectedZoneIndex == -1 || zones[selectedZoneIndex].type != "circle"} type="number" min={10} max={1000000} onBlur={(e)=>{
                        if (parseInt(e.target.value) < 10) e.target.value = "10";
                        if (parseInt(e.target.value) > 1000000) e.target.value = "1000000";
                        handleRadiusChange(e);
                    }} defaultValue={zones.length > 0 && selectedZoneIndex != -1 && zones[selectedZoneIndex].radius ? zones[selectedZoneIndex].radius : 300} onChange={handleRadiusChange} />
                    <p style={{
                        position:"relative",
                        fontSize:14,
                        marginTop:10
                    }} title="If you are in 2 zones, the system will choose the one with the highest priority."><b>Priority</b></p>
                    <input className="create" style={{
                        position: "relative",
                        width:"90%"
                    }} type="number" id="prio" disabled={zones[selectedZoneIndex]?.isEntireWorld} min={-999} max={1000} defaultValue={zones[selectedZoneIndex]?.priority} onChange={handlePriorityChange} onBlur={(e) => {
                        if (parseInt(e.target.value) < -999) e.target.value = "-999";
                        if (parseInt(e.target.value) > 1000) e.target.value = "1000";
                        const newZones = [...zones];
                        newZones[selectedZoneIndex].priority = parseInt(e.target.value);
                        setZones(newZones);
                    }}/>
                    <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:30,fontSize:14}}><b>Redirect to</b></p>
                    <textarea
                    id="locRedirect"
                    className="disabled:bg-neutral-400"
                    placeholder="URL / VCard / ..."
                    autoCapitalize="none"
                    autoCorrect="none"
                    spellCheck="false"
                    onChange={(e) => {
                        // save to zones
                        const newZones = [...zones];
                        newZones[selectedZoneIndex].redirectTo = e.target.value || "";
                        setZones(newZones);
                    }}
                    style={{
                        border: "1px black solid",
                        borderRadius: 8,
                        textAlign: "center",
                        maxHeight: 250,
                        minHeight: 30,
                        height: 30,
                        width: "90%"
                    }}
                    ></textarea>
                    <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:5, fontSize:14}} title="Where to navigate once the QR-code has expired"><b>After Expiry</b> <span style={{
                            fontSize: '8pt',
                            flexBasis: '100%',
                            marginTop: -5
                        }}>(optional)</span></p>
                    <textarea
                    id="locAERedirect"
                    className="disabled:bg-neutral-400"
                    placeholder="URL / VCard / ..."
                    autoCapitalize="none"
                    autoCorrect="none"
                    spellCheck="false"
                        onChange={(e) => {
                            // save to zones
                            const newZones = [...zones];
                            newZones[selectedZoneIndex].afterExpiry = e.target.value || "";
                            setZones(newZones);
                        }}
                    style={{
                        border: "1px black solid",
                        borderRadius: 8,
                        textAlign: "center",
                        maxHeight: 250,
                        minHeight: 30,
                        height: 30,
                        width: "90%"
                    }}
                    ></textarea>
                    
                    <br/>
                    {/* <button className="create" type="button" hidden={!zones[selectedZoneIndex]?.isEntireWorld} style={{
                        position: "relative",
                        width:"80%",
                        height: "30px",
                        marginTop: 35,
                        borderRadius:16
                    }} onClick={!zones[selectedZoneIndex]?.isEntireWorld ? null : ()=>toggleView(selectedZoneIndex)} disabled={!zones[selectedZoneIndex]?.isEntireWorld}>Toggle View</button> */}
                    <button className="create" type="button" style={{
                        position: "relative",
                        width:"80%",
                        height: "30px",
                        marginTop: 35,
                        borderRadius:16
                    }} onClick={zones[selectedZoneIndex]?.isEntireWorld ? ()=>toggleView(selectedZoneIndex) : flyToZoneWithIndex}>{zones[selectedZoneIndex]?.isEntireWorld ? "Toggle View" : "Fly to Zone"}</button>
                    <button className="create" type="button" style={{
                        position: "relative",
                        width:"80%",
                        height: "30px",
                        marginTop: 10,
                        borderRadius:16
                    }} hidden={zones.length < 1 || selectedZoneIndex == -1} onClick={deactivateAllZones}>
                    Deselect Zone
                </button>
                    <button className="create" type="button" style={{
                        position: "relative",
                        width:"80%",
                        height: "30px",
                        marginTop: 10,
                        borderRadius:16
                    }} onClick={() => confirm("You are about to delete Zone "+(selectedZoneIndex+1)+" ("+(zones[selectedZoneIndex]?.isEntireWorld ? "World" : zones[selectedZoneIndex]?.type[0].toUpperCase() + zones[selectedZoneIndex]?.type.substring(1)) +"). Are you sure you want to delete this zone?") ? deleteZone(selectedZoneIndex):null}>Delete Zone {selectedZoneIndex + 1}</button>
                </div>
                <br/>

                <ul style={{
                    listStyle: "disc",
                    left: "50%",
                    position: "relative",
                    transform: "translateX(-50%)",
                    width: "fit-content",
                    marginLeft:7,
                    marginBottom:10,
                }}>
                    {zones.map((zone, index) =>
                        <li key={"SelectZoneList_"+index} style={{fontWeight:600,height:30,cursor:"pointer",textDecoration:"underline"}} onClick={() => setSelectedZoneIndex(index)}>Select Zone {index + 1} ({zone.isEntireWorld ? "World" : zone.type[0].toUpperCase() + zone.type.substring(1)})</li>
                    )}
                </ul>
            </div>
        </React.Fragment>
    );
    function PolygonPointsController({points}:{points:LatLngTuple[]}) {
        const pointPairs = points.map((point, index) => [point, points[(index + 1) % points.length]]);
    
        const circleIcon = new DivIcon({
            className: 'custom-icon',
            html: '<div style="width: 10px; height: 10px; background: '+colors[zones.length%colors.length]+'; border-radius: 50%;"></div>',
            iconSize: [10, 10]
        });
        
        const handleDragEnd = (index: number) => {
            return (e: any) => {
                const newPoints = [...points];
                newPoints[index] = [e.target.getLatLng().lat, e.target.getLatLng().lng];
                setPolygonPositions(newPoints);
            };
        };

        return (
            <>
                {pointPairs.length > 1 ? pointPairs.map((pair, index) => (
                    <Polyline key={index} positions={pair} color="black" />
                )):null}
                {points.map((point, index) => (
                    <Marker 
                        key={index} 
                        position={point}
                        title={"Point "+(index+1)}
                        draggable={true} 
                        eventHandlers={{ dragend: handleDragEnd(index) }}
                        icon={circleIcon}
                    >
                        <Popup>
                            Point {index + 1}
                        </Popup>
                    </Marker>
                ))}
            </>
        );
    }

    

        function ZoneController({ zones, selectedZoneIndex }: { zones: {
            L: L.Circle<any> | L.Polygon<any>;
            bounds: L.LatLngBounds;
            hidden: boolean;
            isEntireWorld: any; type: 'circle' | 'polygon', positions: LatLngTuple[], radius?: number 
    }[], selectedZoneIndex: number }) {
            const context = useLeafletContext();
            const container = context.map
            useMapEvents({
                click: handleMapClick,
            });

            let [elements, setElements] = useState([] as any[]);

            useEffect(() => {
                for (let zone of zones) {
                    if (zone.L)
                    zone.L.remove()
                }
                if (elements.length > 0) {
                    setElements([]);
                }
                zones.forEach((zone, index) => {
                    if (zone.type === 'circle') {
                        const circle = L.circle(zone.positions[0], {
                            radius: zone.radius!,
                            color: index === selectedZoneIndex ? "black" : colors[index % colors.length],
                            weight: index === selectedZoneIndex ? 7 : 3,
                            fillColor: colors[index % colors.length],
                            interactive: !(isCreatingZone || selectedZoneIndex != -1)
                        });

                        // make it follow the circle
                        // attach popup
                        circle.bindPopup(`Zone ${index + 1}`);
                        zone.L = circle;
                        if (!zone.hidden) {
                            circle.addTo(container);
                            zone.bounds = circle.getBounds();
                        }
                        setElements(prevElements => [...prevElements, circle]);
                    } else {
                        console.log("Edited entire world? ", zone.isEntireWorld)
                        const polygon = L.polygon(zone.positions, {
                            color: index === selectedZoneIndex ? "black" : colors[index % colors.length],
                            weight: index === selectedZoneIndex ? 7 : 3,
                            fillColor: colors[index % colors.length],
                            interactive: !(isCreatingZone || selectedZoneIndex != -1),
                        })

                        // attach popup
                        polygon.bindPopup(`Zone ${index + 1}`);
                        zone.L = polygon;
                        if (!zone.hidden) {
                            polygon.addTo(container);
                            zone.bounds = polygon.getBounds();
                        }
                        setElements(prevElements => [...prevElements, polygon]);
                    }
                })
            }, [zones, selectedZoneIndex, container, elements.length]);

            return <></>
        }
}