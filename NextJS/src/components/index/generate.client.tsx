"use client";
import Image from "next/image";
import React, { useState, useEffect } from 'react';

export default function GenerateQRs({
    token,
    apiURL,
    handleClick
}: {
        token: string,
        apiURL: string,
        handleClick: (form: FormData) => Promise<void>
}) {
    "use client"
    const [qrcodes, setQRCodes] = useState([]);


      function escapeHtml(unsafe: string | null)
      {
          if (!unsafe) return undefined
          return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
          }
      function createQR(qrcodeJSON:any) {
    
        return (
            <form action={handleClick} key={qrcodeJSON.id} className="qr select-none" id="manage-qr-form" style={{
                display: "flex",
                border: "1px black solid",
                justifyContent: "flex-start",
                flexDirection: "column",
            }}>
                <input type="hidden" name="id" id="qr-id-input" value={qrcodeJSON.id}/>
                <button title="Click to manage" className="qr select-none" id="sample-qr" style={{
                    paddingLeft: "25px",
                    paddingRight: "25px",
                    paddingBottom: "10px",
                }}>
                    <Image id="qr-img" src={qrcodeJSON.png} width={250} height={250} alt="qrcode.png" style={{
                        position: "relative",
                        top: "8px",
                        width: "250px",
                        height: "250px",
                    }}></Image>
                    <div id="information" style={{textAlign: "center"}}>
                        <p className="information" id="qr-id-cntr">ID:<br/><b><span id="qr-id">{qrcodeJSON.id}</span></b></p>
                        <p className="information" id="qr-name-cntr">Name:<br/><b><span id="qr-name">{escapeHtml(qrcodeJSON.name) ?? <i>-</i>}</span></b></p>
                        <p className="information" id="qr-description-cntr">Description<br/><b><span id="qr-description">{escapeHtml(qrcodeJSON.description) ?? <i>-</i>}</span></b></p>
                        <p className="information" id="qr-createdat-cntr">Created At:<br/><b><span id="qr-createdat">{new Date(qrcodeJSON.created).toLocaleString()}</span></b></p>
                        <p className="information" id="qr-updatedat-cntr">Last Updated:<br/><b><span id="qr-updatedat">{new Date(qrcodeJSON.updated).toLocaleString()}</span></b></p>
                        <p className="information" id="qr-scancount-cntr">Scan Count:<br/><b><span id="qr-scancount">{qrcodeJSON.scanCount}</span></b></p>
                        <p className="information" id="qr-expires-cntr">Expires:<br/><b><span id="qr-expires">{qrcodeJSON.expires ? new Date(qrcodeJSON.expires).toLocaleString() : "Never"}</span></b></p>
                        <p className="information" id="qr-valid-cntr">Valid:<br/><b><span id="qr-valid" style={{color:qrcodeJSON.expires ? new Date(qrcodeJSON.expires) > new Date() ? "#3bc53b" : "#c92121" : "#3bc53b"}}>YES</span></b></p>
                    </div>
                </button>
            </form>
        )

      }
      useEffect(() => {

        function getQRs(): Promise<object[]> {
            return new Promise((resolve, reject) => {
              fetch(apiURL + "/qrcode/list?export=png",{
                    headers: {
                        Authorization: `${token}`,
                    },
              })
                .then((response) => response.json())
                .then((data) => {
                  if (data.error) {
                    // if error, reject promise
                    reject(data.error);
                  } else {
                    // if no error, resolve promise
                    resolve(data);
                  }
                });
            });
          }
        getQRs().then((codes) => {
        //   console.log(codes);
          setQRCodes(codes);
        });
      }, [apiURL, token]);
    


      return (
        <>
          {qrcodes.map((qrcode: any) => createQR(qrcode))}
        </>
      );
}