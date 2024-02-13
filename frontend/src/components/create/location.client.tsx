"use client";
import L, { DivIcon, LatLng, LatLngTuple } from "leaflet";
import { useEffect, useState } from "react";
import { useLeafletContext } from '@react-leaflet/core'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents, Tooltip, CircleMarker, Polyline, Polygon } from 'react-leaflet'
import "./test.css"
import crypto from 'crypto'
export default function Location() {
    const [zones, setZones] = useState([] as any[]);
    const [type, setType] = useState("")
    const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
    const [isCreatingZone, setIsCreatingZone] = useState(false);
    const [zoneType, setZoneType] = useState("circle"); // "circle" or "polygon"
    const [polygonPositions, setPolygonPositions] = useState([] as LatLngTuple[]); // The positions of the polygon's vertices [lat, lng
    const colors = ["blue", "red", "green", "yellow", "purple", "orange"]; // Add more colors if needed
    const [verifiying, setVerifying] = useState(false)
    const [map, setMap] = useState(null)

    
    useEffect(()=>{
        function getData() {
            if (type == "location") {
                window.dispatchEvent(new CustomEvent("data", { detail: { zones: convertToBeautiful(zones) } }));
            }
        }
        window.addEventListener("getData", getData)

        return ()=>{
            window.removeEventListener("getData", getData)
        }
        
    },[zones])

    function convertToBeautiful(zones: any, includeFunctions = false) {
        console.log(zones)
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
                bounds: {
                    north: number;
                    east: number;
                    south: number;
                    west: number;
                    northEast: LatLngTuple;
                    southWest: LatLngTuple;
                    northWest: LatLngTuple;
                    southEast: LatLngTuple;
                    Bbox: string;
                    intersects?: (bounds: any) => boolean;
                    contains?: (bounds: any) => boolean;
    
                }
            } = {
                type: zone.type,
                priority: zone.priority,
                isEntireWorld: zone.isEntireWorld || false,
                redirectTo: zone.redirectTo,
                afterExpiry: zone.afterExpiry,
                bounds: {
                    north: zone?.bounds?.getNorth() || 0,
                    east: zone?.bounds?.getEast() || 0,
                    south: zone?.bounds?.getSouth() || 0,
                    west: zone?.bounds?.getWest() || 0,
                    northEast: zone?.bounds?.getNorthEast() || new LatLng(0,0),
                    southWest: zone?.bounds?.getSouthWest() || new LatLng(0,0),
                    northWest: zone?.bounds?.getNorthWest() || new LatLng(0,0),
                    southEast: zone?.bounds?.getSouthEast() || new LatLng(0,0),
                    Bbox: zone?.bounds?.toBBoxString() || "0,0,0,0"
                }
            };
            if (zone.type === "circle") {
                newZone.center = zone.positions[0];
                newZone.radius = zone.radius;
            } else {
                newZone.positions = zone.positions;
            }
            if (includeFunctions) {
                newZone.bounds.intersects = zone.bounds.intersects;
                newZone.bounds.contains = zone.bounds.contains;
            }
            return newZone;
        })
        console.log("RES",res)
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

    useEffect(() => {
        (document.getElementById("radiusChange") as HTMLInputElement).value = zones.length > 0 && selectedZoneIndex != -1 && zones[selectedZoneIndex].radius ? zones[selectedZoneIndex].radius : 300;
    }, [selectedZoneIndex]);

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
        window.addEventListener("typeChange", onTypeChanged)
        window.addEventListener("verifyZones", verifyZones)
        function onTypeChanged(event: any) {
            setType(event.detail)
        }
        function verifyZones() {
            setVerifying(true)
            console.log("Verifying")
            if (validateLocation(zones)) {
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
            window.removeEventListener("typeChange", onTypeChanged)
            window.removeEventListener("verifyZones", verifyZones)
        }    
    },[zones])
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
            console.log("Z",zones)

            if (zones.length < 1) {
                alert("You need at least 1 zone")
                return false
            }

            // at least 2 zones
            if (zones.length == 1 && zones[0].isEntireWorld) {
                alert("Your only zone cannot be the entire world, if you need to make it work everywhere, check out the 'Redirect' action.")
                return false
            }



            let intersections = []
            for (let zoneIndex in zones) {
                for (let zoneIndex2 in zones) {
                    if (zoneIndex == zoneIndex2) continue;
                    if (zones[zoneIndex].bounds.intersects(zones[zoneIndex2].bounds)) {
                        intersections.push([zoneIndex, zoneIndex2]);
                    }
                }
            }
            // remove duplicates
            let uniqueIntersections: any[][] = [];
            for (let intersection of intersections) {
                if (!uniqueIntersections.some(a=>a[0] == intersection[1] && a[1] == intersection[0])) {
                    uniqueIntersections.push(intersection);
                }
                
                
            }
            console.log("These zones are intersecting:", uniqueIntersections);
            // find the biggest zone in each intersection
            let problemZones = [];
            for (let intersection of uniqueIntersections) {
                let zone1 = zones[intersection[0] as number];
                let zone2 = zones[intersection[1] as number];
                if (!zone1.bounds.contains(zone2.bounds) && !zone2.bounds.contains(zone1.bounds)) {
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

            return true
        }

        function toggleView(index: number) {
            const zone = zones[index];

            if (zone.L._map) {
                zone.L.removeFrom(map);
                zones[index].hidden = true;
                return;
            } else {
                zone.L.addTo(map);
                zones[index].hidden = false;
            }
        }
        function isVisible(index: number) {
            console.log(index, zones, !!zones[index]?.L?._map)
            if (!zones[index]?.L) return true; // the zone controller hasnt had time to add the layer to the map
            if (zones.length > 0 && index != -1) {
                return !!zones[index].L._map
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
        },[])

        return <></>
    }
    function LayerOrganizer({zones}: {zones: any[]}) {
        const context = useLeafletContext();
        const map = context.map
        useEffect(()=>{
            const copy = [...zones];
            for (let zone of copy.sort((a,b)=>a.priority - b.priority)) { 
                zone.L.bringToFront();
            }
        },[zones])
        return <></>
    }
    function HideController() {
        const context = useLeafletContext();
        const map = context.map
        setMap(map)
        return <></>
    }

    useEffect(()=>{
        if (zones.length > 0 && selectedZoneIndex != -1) {
            (document.getElementById("radiusChange") as HTMLInputElement).value = zones.length > 0 && selectedZoneIndex != -1 && zones[selectedZoneIndex].radius ? zones[selectedZoneIndex].radius : 300;
            (document.getElementById("prio") as HTMLInputElement).value = zones[selectedZoneIndex]?.priority || 0;
            (document.getElementById("locRedirect") as HTMLInputElement).value = zones[selectedZoneIndex]?.redirectTo || "";
            (document.getElementById("locAERedirect") as HTMLInputElement).value = zones[selectedZoneIndex]?.afterExpiry || "";
        }
    },[selectedZoneIndex])
    return (
        <div>
            <MapContainer maxBounds={[[-85.05115, -180], [85, 180]]} maxBoundsViscosity={1.0} style={{ width: 600, height: 400, left:"50%", transform:"translateX(-50%)" }} center={zones.length > 0 && selectedZoneIndex >= 0 && selectedZoneIndex < zones.length ? zones[selectedZoneIndex].position : [51.505, -0.09]} zoom={2} minZoom={2} >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* {zones.map((zone, index) => (
                    <Marker key={"-"+index} position={zone.position} icon={L.icon({ iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", iconSize: [25, 41] })} />
                ))} */}
                <ZoneController zones={zones} selectedZoneIndex={selectedZoneIndex} />
                <PolygonPointsController points={polygonPositions} />
                <SizeInvalidator/>
                <LayerOrganizer zones={zones}/>
                <HideController/>
            </MapContainer>
            <p style={{
                color: "darkgray",
                fontSize: "10pt",
                fontWeight: 500,
                position:"absolute",
                left:"50%",
                transform:"translateX(-50%)"
            }} hidden={!isCreatingZone}>{zoneType == "circle" ? "Click/Tap on the map to create a circle zone" : zoneType == "polygon" ? "Click/Tap on the map to place your first polygon point" : "Click/Tap on the map to create a zone for the entire world"}</p>
            <br/>
        <button style={{
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
                <select value={zoneType} style={{ width:200}} onChange={(e) => setZoneType(e.target.value)}>
                    <option value="circle">Circle</option>
                    <option value="polygon">Polygon</option>
                    <option disabled={zones.some(a=>a.isEntireWorld)} hidden={zones.some(a=>a.isEntireWorld)} value="entireWorld">Entire World</option>
                </select>
                <button style={{
                    fontSize: "11pt",
                    height: 30,
                    marginTop: 20,
                    width: "200px",
                }} hidden={
                !isCreatingZone || zoneType != "polygon"
            } onClick={finishPolygonZone}>
                Finish Polygon Zone
            </button>
            <p hidden={zones.length < 1 || selectedZoneIndex == -1 || zones[selectedZoneIndex]?.type != "polygon" || zones[selectedZoneIndex]?.isEntireWorld } style={{
                    marginBottom:5,
                    marginTop:10
                }}><b>Points:</b></p>
            <ul style={{textAlign:"center",marginTop:10}}>
            {polygonPositions.map((point, index) => (
                <li style={{cursor:"pointer", fontWeight:600, textDecoration:"underline"}} onMouseOver={()=>highlightPolygonPoint(index)} onMouseOut={()=>unHighlightPolygonPoint(index)} onClick={() => handleDeletePoint(index)}>Delete Point {index + 1}</li>
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
                    }}>Zone {selectedZoneIndex+1}</span>
                </p>

                
                <p style={{
                    position:"relative",
                    fontSize:14
                }} hidden={zones.length < 1 || selectedZoneIndex == -1 || zones[selectedZoneIndex].type != "circle"}
                title="The radius (in meters) of the zone."><b>Radius (meters)</b></p>
                <input id="radiusChange" style={{
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
                <input style={{
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
                    height: 30
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
                    height: 30
                  }}
                ></textarea>
                
                <br/>
                <button hidden={!zones[selectedZoneIndex]?.isEntireWorld} style={{
                    position: "relative",
                    width:"80%",
                    height: "30px",
                    marginTop: 35,
                    borderRadius:16
                }} onClick={!zones[selectedZoneIndex]?.isEntireWorld ? null : ()=>toggleView(selectedZoneIndex)} disabled={!zones[selectedZoneIndex]?.isEntireWorld}>Toggle View</button>
                <button style={{
                    position: "relative",
                    width:"80%",
                    height: "30px",
                    marginTop: zones[selectedZoneIndex]?.isEntireWorld ? 10 : 35,
                    borderRadius:16
                }} onClick={zones[selectedZoneIndex]?.isEntireWorld ? null : flyToZoneWithIndex} disabled={zones[selectedZoneIndex]?.isEntireWorld}>Fly to Zone</button>
                <button style={{
                    position: "relative",
                    width:"80%",
                    height: "30px",
                    marginTop: 10,
                    borderRadius:16
                }} hidden={zones.length < 1 || selectedZoneIndex == -1} onClick={deactivateAllZones}>
                Deselect Zone
            </button>
                <button style={{
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
            {/* <p>If a zone is within another zone, the zone inside will take priority, unless priority for the containing zone is higher than the priority of the zone inside</p> */}
            {/* <form action={filledSubmit}>               
                <button type="submit">Check Zones</button>
            </form> */}
        </div>
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
            setElements([]);
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
                    setElements([...elements, circle]);
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
                    setElements([...elements, polygon]);
                }
            })
        }, [zones, selectedZoneIndex ]);

        return <></>
    }
}