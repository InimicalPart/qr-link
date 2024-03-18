// "use server"

export async function generateMetadata(
    { params}: {
        params: { id: string }
    },
    parent: ResolvingMetadata
  ): Promise<Metadata> {
    // read route params
    const id = params.id

    return {
      title: "Manage QRLink with ID " + id,
    }
  }

import "./manage.css"
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { submit } from "@/utilities/(ui)/create/submit.server";
import Image from "next/image";

import Form from "@/components/create/form.client";
import React from 'react'
import QRCodeImage from "@/components/create/qrCodeImage.client";
import ExportButtons from "@/components/all/exportButtons.client";
import { Metadata, ResolvingMetadata } from "next";
import { getUser } from "@/utilities/api/v1/authentication";

const API_URL = (process.env.API_URL)
export default async function Update({
    params
}: {params:{id:string}}) {
    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    let user = await getUser(cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

    const qrCodeDetails = await fetch(`${API_URL}/qrcode/${params.id}?export=png,svg`, {
        headers: {
            Accept: "application/json",
            Authorization: `${cookies().get("token").value}`
        },
    }).then((res) => res.json())

    async function logout() {
        "use server";
        cookies().delete("token")
        redirect("/login")
    }


    async function delQR() {
        "use server";

        const id = params.id
        if (id) {
            await fetch(`${API_URL}/qrcode/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: cookies().get("token").value
                }
            }).then((res) => {
                if (res.status === 200) {
                    redirect("/dashboard")
                } else {
                    console.error(res)
                }

            })
        }

    }

    async function goToStatistics() {
        "use server";
        redirect(`/statistics/${params.id}`)
    }

    const updateSubmit = submit.bind(null, "update", qrCodeDetails)
    
    return (
        <div className="manage main-container" style={{
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

          <div id="create-new">
              <div style={{
                  width: 250,
                  height: 250,
                  left: '50%',
                  marginTop: 50,
                  position: 'relative',
                  transform: 'translateX(-50%)'
              }}>
                  {/* <div id="qr-code" className="select-none"></div> */}
                  <QRCodeImage qrCodeDetails={qrCodeDetails} API_URL={API_URL}/>
              </div>
              <div style={{
                    width: 250,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    position: 'relative',
                }}>
                <hr style={{
                            width: 250,
                            position: 'relative',
                            height: 2,
                            background: 'black',
                            borderRadius: 5
                    }}/>
                    <ExportButtons qrCodeDetails={qrCodeDetails} token={cookies().get("token").value} className={"manage button"} API_URL={API_URL}/>
                    <form action={goToStatistics}>
                        <button type="submit" id="viewStatsButton" className="manage button" style={{
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginTop: 30,
                            position: 'relative'
                        }}>
                            View Statistics
                        </button>
                    </form>
                    <hr style={{
                            width: 250,
                            position: 'relative',
                            height: 2,
                            background: 'black',
                            marginTop: 30,
                            borderRadius: 5
                    }}/>

              </div>
              <div id="qr-info" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  position: 'relative',
                  top: 20
              }} className="select-none">
              <Form submit={updateSubmit} qrCodeInfo={qrCodeDetails} delQR={delQR}/>
              </div>
          </div>
      
        <footer className="copyright-footer manage">
            <p>
                &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
            </p>
        </footer>
  </div>
      );
}


