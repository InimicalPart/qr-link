"use client";

import moment from "moment-timezone";
import Image from "next/image";
import React, { useState, useEffect } from 'react';
import SmallStat from "./smallStat.client";

export default function GenerateQRs({
    token,
    apiURL,
    handleClick
}: {
        token: string,
        apiURL: string,
        handleClick: (form: FormData) => Promise<void>
}) {
        const [qrcodes, setQRCodes] = useState([]);
        const [searchText, setSearchText] = useState("");
        const [regexError, setRegexError] = useState(false);
        
        const [searchByName, setSearchByName] = useState(true);
        const [searchByDesc, setSearchByDesc] = useState(true);
        const [searchByID, setSearchByID] = useState(true);

        useEffect(() => {

            function setText(e: any) {
                setSearchText(e.target.value);
            }

            const searchInput = document.getElementById("qr-search") as HTMLInputElement;
            if (searchInput) {
                searchInput.addEventListener("input", setText)
            }

            return () => {
                if (searchInput) {
                    searchInput.removeEventListener("input", setText);
                }
            }
        })

        function genRegex() {
            try {
                const regexp = new RegExp(searchText,"mi");
                if (regexError) setRegexError(false);
                document.getElementById("qr-search").style.border = null;
                return regexp;
            } catch (e) {
                if (!regexError) setRegexError(true);
                document.getElementById("qr-search").style.border = "1px solid red";
                return new RegExp("","mi");
            }
        }

        
        function createQR(qrcodeJSON:any) {
            function matchesSearch(detailed:boolean = false, ignoreSearchBy:boolean = false) {
                const regex = genRegex();

                const nameMatches = (searchByName || ignoreSearchBy) && regex.test(qrcodeJSON.name ?? "No Name");
                const descMatches = (searchByDesc || ignoreSearchBy) && regex.test(qrcodeJSON.description ?? "No Description");
                const idMatches   = (searchByID   || ignoreSearchBy) && regex.test(qrcodeJSON.id);
                
                if (detailed) {
                    return {
                        name: nameMatches,
                        desc: descMatches,
                        id: idMatches
                    };
                }
                return nameMatches || descMatches || idMatches;
            }
            return (
                    <form action={handleClick} key={qrcodeJSON.id} className="qr select-none" id="manage-qr-form" style={{
                        display: "flex",
                        border: "1px black solid",
                        borderRadius:3,
                        backgroundColor: "white",
                        justifyContent: "flex-start",
                        flexDirection: "column",
                        pointerEvents: "all",
                        overflow: "hidden",
                        width: "302px",
                        position:"relative",
                        order: matchesSearch() ? 0 : 1,
                        
                    }}>
                        <input type="hidden" name="id" id="qr-id-input" value={qrcodeJSON.id}/>
                        <div id="overlay" style={{
                            width:"100%",
                            height:"100%",
                            opacity: matchesSearch() ? 0 : 0.7,
                            position:"absolute",
                            backgroundColor: "white",
                            borderRadius:3,
                            pointerEvents: matchesSearch() ? "none" : "all",
                            zIndex:10,
                            transition: "opacity 0.25s"
                        }}>

                        </div>
                        <button type="submit" title="Click to manage" className="qr select-none" id="sample-qr" style={{
                            paddingLeft: "25px",
                            paddingRight: "25px",
                        }}>
                            <Image id="qr-img" src={qrcodeJSON.png} width={250} height={250} alt="qrcode.png" style={{
                                position: "relative",
                                top: "8px",
                                width: "250px",
                                height: "250px",
                            }}></Image>

                            <div style={{
                                display:matchesSearch(undefined, true) && !regexError && !!searchText ? "flex" : "none",
                                flexWrap:"wrap",
                                width:"min-content",
                                gap:2,
                                zIndex:20,
                                marginTop:2.5,
                                marginBottom:2.5,
                                maxWidth: 352,
                                left: "50%",
                                transform: "translateX(-50%)",
                                position: "relative",
                                transition: "display 0.25s"
                            }}>
                                <span onClick={(e)=>{e.preventDefault(); setSearchByID(!searchByID)}} title={"Your search query matched to this QRLink-code's ID ("+qrcodeJSON.id+"). Click to toggle."} hidden={!regexError && !genRegex().test(qrcodeJSON.id) || !searchText} className={(searchByID ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-400") + " text-xs font-medium px-2.5 py-0.5 rounded-full relative w-max left-1/2 -translate-x-1/2 dashboard badge"}>ID Matches</span>
                                <span onClick={(e)=>{e.preventDefault(); setSearchByName(!searchByName)}} title={"Your search query matched to this QRLink-code's name. Click to toggle."} hidden={!regexError && !genRegex().test(qrcodeJSON.name ?? "No Name") || !searchText} className={(searchByName ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-400") + " text-xs font-medium px-2.5 py-0.5 rounded-full relative w-max left-1/2 -translate-x-1/2 dashboard badge"}>Name Matches</span>
                                <span onClick={(e)=>{e.preventDefault(); setSearchByDesc(!searchByDesc)}} title={"Your search query matched to this QRLink-code's description. Click to toggle."} hidden={!regexError && !genRegex().test(qrcodeJSON.description ?? "No Description") || !searchText} className={(searchByDesc ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-400") + " text-xs font-medium px-2.5 py-0.5 rounded-full relative w-max left-1/2 -translate-x-1/2 dashboard badge"}>Description Matches</span>
                            </div>
                            {/* <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded relative ">Matches ID</span> */}

                            <div id="information" style={{textAlign: "center"}}>
                                <p className="information" id="qr-name-cntr"><b>Name:</b><br/><span id="qr-name" style={{
                                    height: "3em",
                                    overflow: "hidden",
                                    display: "-webkit-box",
                                    textOverflow: "ellipsis",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                }} title={qrcodeJSON.name ?? "No Name"}>{qrcodeJSON.name ?? <i style={{color:"#696969"}}>No Name</i>}</span></p>
                                <p className="information" id="qr-description-cntr"><b>Description:</b><br/><span className="qr-desc" id="qr-description" style={{
                                    height: "4.5em",
                                    overflow: "hidden",
                                    display: "-webkit-box",
                                    textOverflow: "ellipsis",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                }} title={qrcodeJSON.description ?? "No Description"}>{ qrcodeJSON.description ?? <i style={{color:"#696969"}}>No Description</i>}</span></p>
                                <p className="information" id="qr-expires-cntr"><b>Expires:</b><br/><span id="qr-expires" style={{color:qrcodeJSON.expires ? new Date(qrcodeJSON.expires) > new Date() ? "darkgreen" : "darkred" : "darkgreen"}}><b>{qrcodeJSON.expires ? new Date(qrcodeJSON.expires).toLocaleString([],{day:"numeric", year:"numeric", month:"numeric", hour: 'numeric', minute:'2-digit'}): "Never"}</b></span></p>
                            </div>
                            <div id="stats" style={{pointerEvents: "none",height:"fit-content", width:"100%",paddingBottom:15}}>
                                <p className="information" id="qr-expires-cntr"><b>Scans:</b></p>
                                <p style={{fontWeight:700, pointerEvents:"all"}} title={numberWithCommas(qrcodeJSON.scanCount)}>{numberFormatter(qrcodeJSON.scanCount,2)}</p>
                                <SmallStat onClick={"/statistics/"+qrcodeJSON.id} title={"Scans during the last 2 months, click to view all statistics"} style={{pointerEvents: "all", cursor:"pointer"}} width={150} height={50} data={[...qrcodeJSON.statistics,...(qrcodeJSON.statistics.length < 2 ? [{count:0},{count:0}] : [])] } className="relative left-[50%] -translate-x-1/2 mt-4"></SmallStat>
                            </div>
                        </button>
                    </form>
            )

        }
            function numberWithCommas(x:any) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }

            function numberFormatter(num: number, digits: number) {
                const lookup = [
                { value: 1, symbol: "" },
                { value: 1e3, symbol: "K" },
                { value: 1e6, symbol: "M" },
                { value: 1e9, symbol: "G" },
                { value: 1e12, symbol: "T" },
                { value: 1e15, symbol: "P" },
                { value: 1e18, symbol: "E" }
                ];
                const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/;
                const item = lookup.findLast(item => num >= item.value);
                return item ? (num / item.value).toFixed(digits).replace(regexp, "").concat(item.symbol) : "0";
            }

            useEffect(() => {

                function getQRs(): Promise<object[]> {
                    return new Promise((resolve, reject) => {
                    fetch(apiURL + "/qrcode/list?export=png&statistics=L2M&fields=timestamp&timezone="+moment.tz.guess(), { headers: { Authorization: `Bearer ${token}` } }) //! L2M = Last 2 Months
                        .then((response) => response.json())
                        .then((data) => {
                        if (data.error) {
                            reject(data.error);
                        } else {
                            resolve(data);
                        }
                        });
                    });
                }
                getQRs().then((codes) => {
                    setQRCodes(codes)
                });
            }, [apiURL, token]);
        



        return (
            <>
                {qrcodes.map((qrcode: any) => createQR(qrcode))}
            </>
        );
}