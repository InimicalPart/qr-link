"use client";

import { useEffect,useState } from "react";

export default function Settings({
    state,
    // apiURL
}: {
        state: any,
        // apiURL: string
}) {
    const [getScanData, setGetScanData] = useState(false)
    const [getLocation, setGetLocation] = useState(false)
    const [sendToURL, setSendToURL] = useState(false)


    return (
      <div style={{


        width:"300px",
        padding: "10px 0px",
        marginTop:20,
        border: "1px solid black",
        textAlign: "left",
        position: "relative",
        left: "50%",
        transform: "translateX(-50%)",
      }}>
        <p style={{
            textAlign: "center",
            marginBottom: 5
        }}>
            <b>Settings</b>
        </p>
        <div id="scanDataSettings" style={{
            fontSize:"11pt"
        }}> 
            <div style={{width:"fit-content",marginLeft:10}}>
                <input type="checkbox" id="scanData" name="grab_scan_data" onChange={()=>setGetScanData(!getScanData)} />
                <label style={{marginLeft:5}} htmlFor="scanData">Grab information from scans</label>
            </div>
            <div className="extended" hidden={!getScanData} style={{
                width:"fit-content",
                fontSize:"10pt"
            }}>
                <div>
                    <p style={{display:"list-item",marginLeft:20}}><b>Information</b></p>
                    <p className="extended qr-info-label flex justify-center items-center flex-wrap" style={{
                        fontSize: "9pt",
                        color: "red",
                        marginTop: -2,
                        display: state?.grab_scan_data ? "block" : "none"
                    }}>{state?.grab_scan_data}</p>
                    <div className="extended">
                        <div>
                            <input type="checkbox" id="device-fingerprint" name="grab_device_fingerprint" />
                            <label style={{marginLeft:5}} htmlFor="device-fingerprint">Device Fingerprint</label>
                        </div>
                        <div>
                            <input type="checkbox" id="timestamp" name="grab_timestamp" />
                            <label style={{marginLeft:5}} htmlFor="timestamp">Timestamp</label>
                        </div>
                        <div>
                            <input type="checkbox" id="ip-address" name="grab_ip_address" />
                            <label style={{marginLeft:5}} htmlFor="ip-address">IP address</label>
                        </div>
                        <div>
                            <input type="checkbox" id="user-agent" name="grab_user_agent" />
                            <label style={{marginLeft:5}} htmlFor="user-agent">User-Agent</label>
                        </div>
                        <div>
                            <input type="checkbox" id="location"  onChange={()=>setGetLocation(!getLocation)} name="grab_location" />
                            <label style={{marginLeft:5}} htmlFor="location">Location</label>
                        </div>
                        <div className="extended">
                            <input type="checkbox" id="req-loc" disabled={!getLocation} name="require_location" />
                            <label style={{marginLeft:5}} htmlFor="req-loc">Require location for redirect</label>
                        </div>        
                    </div>
                    <p style={{display:"list-item",marginLeft:20}}><b>Settings</b></p>
                    <div className="extended">
                    <div style={{width:"fit-content",marginLeft:10}} title={"A signed JWT token will be passed through 'qr_scan' on the redirect URL"}>
                            <input type="checkbox"  id="send-to-redirect" onChange={()=>setSendToURL(!sendToURL)} name="send_to_redirect" />
                            <label style={{marginLeft:5}}  htmlFor="send-to-redirect">Send scan info. to redirect URL</label>
                        </div>
                        <div className="extended" hidden={!getScanData} style={{
                            width:"fit-content",
                            fontSize:"10pt"
                        }}>
                            <div>
                                <input type="password" id="jwt-signing-key" style={{border: state?.jwt_singing_key ? "1px red solid" : '1px black solid', borderRadius:4, marginLeft:"12px", fontSize: "9pt",}} name="jwt_singing_key" disabled={!sendToURL} placeholder="&nbsp;JWT signing key" />
                                <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                                    fontSize: "9pt",
                                    color: "red",
                                    display: state?.jwt_singing_key ? "block" : "none",
                                    textAlign: "center",
                                    marginLeft: "12px"
                                }}>{state?.jwt_singing_key}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div hidden={!getScanData} style={{
            width: "100%",
            fontSize: "8pt",
            textAlign: "center",
            color: "red",
            fontWeight: 600,
            paddingRight: "20px",
            paddingLeft: "20px",
            marginTop: "15px",
        }}>
            <p style={{textAlign: "center"}}>
                Getting information from a scan may violate your country's privacy laws. Make sure you are in compliance with your local laws before enabling this feature.
            </p>
          </div>
      </div>
    );
}
