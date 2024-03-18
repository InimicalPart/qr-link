import { QRLinkGlobal } from "@/types/api/v1/global";
import TimeRank from "@/components/statistics/timerank.client";
import moment from "moment-timezone";
import "leaflet/leaflet.css";
import "./statistics.css"

import { notFound, redirect } from "next/navigation";
import DayRank from "@/components/statistics/dayrank.client";
import ScanLocation from "@/components/statistics/location.client";
import TimestampGraph from "@/components/statistics/timestamp.client";
import { getUser } from "@/utilities/api/v1/authentication";
import { cookies } from "next/headers";
import BrowserBar from "@/components/statistics/browsers.client";
import OSBar from "@/components/statistics/oss.client";

import Image from "next/image";

declare const global: QRLinkGlobal

export default async function Statistics({params}: {params:{id:string}}) {

    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    let user = await getUser(cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

    const code = global.QRCodeTable[params.id]

    if (!code || code.linked_to !== user.user.id) {
        // QR code not found or not owned by user
        return redirect("/dashboard")
    }

    async function logout() {
        "use server";
        cookies().delete("token")
        redirect("/login")
    }

    async function backToDashboard() {
        "use server";
        redirect("/dashboard")
    }

    async function generateStatistics(type:string, extra: {
        time?:string,
        multiplier?:number,
        timezone?:string,
        last?:number,
    }={}) {
        "use server";

        return (await global.QRCodeTable[params.id].getStatistics({
            type,
            time: null,
            timezone: moment.tz.guess(),
            ...extra
        }) as {
            info: {[key:string]:number},
            important_moments: {
              date: string,
              update: {
                [key:string]:number
              }  
            }[]
        })
    
    }

    let dayRank = (await generateStatistics("ScannedDayRank"))
    let timeRank = (await generateStatistics("ScannedTimeRank"))

        
    let topScanDay: any = dayRank.info
    topScanDay = {
        text: Object.keys(topScanDay).find((key) => topScanDay[key] === Math.max(...Object.values(topScanDay as {[key:string]:number}))) || "N/A",
        value: Math.max(...Object.values(topScanDay as {[key:string]:number}), 0)
    }
    topScanDay.text = topScanDay.text[0].toUpperCase() + topScanDay.text.slice(1)

    let topScanTime: any = timeRank.info
    topScanTime = {
        text: Object.keys(topScanTime).find((key) => topScanTime[key] === Math.max(...Object.values(topScanTime as {[key:string]:number}))) || "N/A",
        value: Math.max(...Object.values(topScanTime as {[key:string]:number}), 0)
    }

    let scansLast7Days = ((await generateStatistics("ScannedLastX",{time:"day",multiplier:7}))).info.length


    return (
        <div className="statistics main-container" style={{
            backgroundImage: "url('/res/img/newseed_background.png')",
            backgroundRepeat: "no-repeat",
            overflowX: "hidden",
        }}>

            <header style={{padding:"calc(1.5em + 8px)", display:"flex", justifyContent: "space-between"}} className="header">
                <Image src="/res/img/logo.png" priority={true} width={450} height={99} style={{
                    maxHeight: "99px"
                }} alt="QRLink logo"/>
                <div className='header topright' style={{
                    display: "flex",
                    gap: "10px",
                    height:"min-content",
                    width: "min-content",
                    alignItems: "center"
                }}>
                    <div id="buttons" className="w-max header buttons h-[60px]">

                        <form action={logout} className="w-[200px] h-min" id="logOut">
                            <button type="submit" id="logOutButton" className="w-[100%] header main-button">
                                Logout <Image src="/res/img/signout.png" width={40} height={39} alt="Logout" style={{paddingLeft:10}}/>
                            </button>
                        </form>                        
                    </div>
                </div>
            </header>

            <div style={{
                marginTop:50,
                marginBottom:50,
                position: "relative",
                left: "50%",
                padding:"20px",
                transform: "translateX(-50%)",
                display:"flex",
                flexDirection:"column",
                alignItems: "center"
            }}>
                <div id="fun-info" style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    border: "1px solid black",
                    padding: "10px",
                    borderRadius: "10px",
                    minWidth: "fit-content",
                    width:"100%",
                    maxWidth: "600px",
                    backgroundColor: "white"
                }}>
                    <p style={{width:"100%",textAlign:"center",lineHeight:"1"}}><b>Statistics</b></p>

                    <hr style={{width: "100%",margin: "0 auto",backgroundColor: "gray",height: "1px",border: "none",borderRadius: "100vh"}}/>

                    <div style={{display:"flex",justifyContent:"space-between"}}>
                        <p>Day with most scans:</p>
                        <b>{topScanDay.text} ({topScanDay.value})</b>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                        <p>Most scans happen at:</p>
                        {topScanTime.text == "N/A" ?
                        <b id="topTime">{topScanTime.text} ({topScanTime.value})</b> :
                        <b id="topTime">Loading... (??)</b>
                        }
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                        <p>Scans in the last 7 days:</p>
                        <b>{scansLast7Days}</b>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                        <p>Total scans:</p>
                        <b>{code.scanCount}</b>
                    </div>
                </div>
                <br/>
                <div style={{
                    border: "1px solid black",
                    position:"relative",
                    width:"100%",
                    maxWidth: "600px",
                    backgroundColor: "white"
                }}>
                    <p style={{width:"100%",textAlign:"center",lineHeight:"1", padding:10}}><b>Scan Time Graph</b></p>
                    <hr style={{width: "95%",margin: "0 auto",backgroundColor: "darkgray",height: "1px",border: "none", marginBottom:10, borderRadius: "100vh"}}/>

                    <div style={{
                            position: "relative",
                            marginLeft: 20,
                            marginRight: 20,
                            left: 0,
                            marginBottom: 20,
                            width:"calc(100% - 40px)",
                            height:"300px"
                    }}>
                        <TimestampGraph data={await generateStatistics("Scanned",{time:null}) as any}/>
                    </div>
                </div>
                <br/>
                <div style={{
                    border: "1px solid black",
                    position:"relative",
                    width:"100%",
                    maxWidth: "600px",
                    backgroundColor: "white"
                }}>
                    <p style={{width:"100%",textAlign:"center",lineHeight:"1", padding:10}}><b>Scan Day Rank</b></p>
                    <hr style={{width: "95%",margin: "0 auto",backgroundColor: "darkgray",height: "1px",border: "none", marginBottom:10, borderRadius: "100vh"}}/>
                    <div style={{
                            position: "relative",
                            marginLeft: 20,
                            marginRight: 20,
                            left: 0,
                            marginBottom: 20,
                            width:"calc(100% - 40px)",
                            height:"300px"
                    }}>
                        <DayRank data={dayRank}/>
                    </div>
                </div>
                <br/>
                <div style={{
                    border: "1px solid black",
                    position:"relative",
                    width:"100%",
                    maxWidth: "600px",
                    backgroundColor: "white"
                }}>
                    <p style={{width:"100%",textAlign:"center",lineHeight:"1", padding:10}}><b>Scan Time Rank</b></p>
                    <hr style={{width: "95%",margin: "0 auto",backgroundColor: "darkgray",height: "1px",border: "none", marginBottom:10, borderRadius: "100vh"}}/>
                    <div style={{
                            position: "relative",
                            marginLeft: 20,
                            marginRight: 20,
                            left: 0,
                            marginBottom: 20,
                            width:"calc(100% - 40px)",
                            height:"300px"
                    }}>
                        <TimeRank data={timeRank} />
                    </div>
                </div>
                <br/>
                <div style={{
                    border: "1px solid black",
                    position:"relative",
                    width:"100%",
                    maxWidth: "600px",
                    backgroundColor: "white"
                }}>
                    <p style={{width:"100%",textAlign:"center",lineHeight:"1", padding:10}}><b>Scan Locations (last 300 scans)</b></p>
                    <hr style={{width: "95%",margin: "0 auto",backgroundColor: "darkgray",height: "1px",border: "none", marginBottom:10, borderRadius: "100vh"}}/>
                    <div style={{
                            position: "relative",
                            marginLeft: 20,
                            marginRight: 20,
                            left: 0,
                            marginBottom: 20,
                            width:"calc(100% - 40px)",
                            height:"400px"
                    }}>
                        <ScanLocation data={await generateStatistics("ScannedWhere", {last:300}) as any} showRadii={true}/>
                    </div>
                </div>
                <br/>
                <div style={{
                    border: "1px solid black",
                    position:"relative",
                    width:"100%",
                    maxWidth: "600px",
                    backgroundColor: "white"
                }}>
                    <p style={{width:"100%",textAlign:"center",lineHeight:"1", padding:10}}><b>Most Used Browsers</b></p>
                    <hr style={{width: "95%",margin: "0 auto",backgroundColor: "darkgray",height: "1px",border: "none", marginBottom:10, borderRadius: "100vh"}}/>
                    <div style={{
                            position: "relative",
                            marginLeft: 20,
                            marginRight: 20,
                            left: 0,
                            marginBottom: 20,
                            width:"calc(100% - 40px)",
                            height:"300px"
                    }}>
                        <BrowserBar data={await generateStatistics("Browser")}/>
                    </div>
                </div>
                <br/>
                <div style={{
                    border: "1px solid black",
                    position:"relative",
                    width:"100%",
                    maxWidth: "600px",
                    backgroundColor: "white"
                }}>
                    <p style={{width:"100%",textAlign:"center",lineHeight:"1", padding:10}}><b>Most Used OSs</b></p>
                    <hr style={{width: "95%",margin: "0 auto",backgroundColor: "darkgray",height: "1px",border: "none", marginBottom:10, borderRadius: "100vh"}}/>
                    <div style={{
                            position: "relative",
                            marginLeft: 20,
                            marginRight: 20,
                            left: 0,
                            marginBottom: 20,
                            width:"calc(100% - 40px)",
                            height:"300px"
                    }}>
                        <OSBar data={await generateStatistics("OS")}/>
                    </div>
                </div>
                <br/>
                <form action={backToDashboard}>
                    <button type="submit" className="statistics main-button">Back to Dashboard</button>
                </form>
            </div>
            <footer className="copyright-footer statistics">
                <p>
                    &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
                </p>
            </footer>
        </div>
    );
}