import { getUser } from "@/utilities/api/v1/authentication";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";

import "./api.css"
import APIKeyGenerator from "@/components/user/profile/api/generator.client";
import { deleteAPIKey, updateAPIKeyName } from "@/utilities/api/v1/database";
import { QRLinkGlobal } from "@/types/api/v1/global";
import AddAPIKeyButton from "@/components/user/profile/api/addAPIKey.client";

declare const global: QRLinkGlobal

export default async function UserAPI() {

    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    const user = await getUser("Bearer " + cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

    async function revokeAPIKey(id:string) {
        "use server";

        return await fetch(process.env.API_URL+"/user/api-keys/"+id, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + cookies().get("token").value
            }
        }).then((res) => res.json())
    }

    async function updateName(id:string, name:string) {
        "use server";

        return await fetch(process.env.API_URL+"/user/api-keys/"+id, {
            method: "PATCH",
            headers: {
                "Authorization": "Bearer " + cookies().get("token").value,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name
            })
        }).then((res) => res.json())
    }

    async function createAPIKey(data: {name:string,permissions:string[]}) {
        "use server";

        return await fetch(process.env.API_URL+"/user/api-keys", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + cookies().get("token").value,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }).then((res) => res.json())
    }

    async function backToProfile() {
        "use server";
        redirect("/user/profile")
    }


    async function logout() {
        "use server";
        cookies().delete("token")
        redirect("/login")
    }

    async function goToHome() {
        "use server";
        redirect("/")
    }

    return (        <div className="profile-api main-container" style={{
        backgroundImage: "url('/res/img/newseed_background.png')",
        backgroundRepeat: "no-repeat",
        overflowX: "hidden",
    }}>
        <header style={{padding:"calc(1.5em + 8px)", display:"flex", justifyContent: "space-between"}} className="header">
        <form action={goToHome}>
            <button type="submit">
                <Image src="/res/img/logo.png" priority={true} width={450} height={99} style={{
                    maxHeight: "99px"
                }} alt="QRLink logo"/>
            </button>
        </form>
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
            position:"relative",
            left:"50%",
            transform:"translateX(-50%)",
            width: "fit-content",
            height:"fit-content",

            display:"flex",
            flexDirection:"column",
            alignItems:"center",
            justifyContent:"center",
            
        }}>
            <p className="font-extrabold text-xl md:text-2xl lg:text-3xl mb-2 mt-4 md:mt-0">QRLink API keys for {user.user.firstName}</p>
            <div id="api-key-container" style={{
                display:"flex",
                flexDirection:"column",
                top: "40%",
                position:"relative",
                width: "90svw",
                maxWidth: "900px",
                height:"500px",
                border:"2px solid black",
                borderRadius:5,
                overflowY:"auto",

            }}>

                <APIKeyGenerator API_URL={process.env.API_URL} token={cookies().get("token").value} onRevoke={revokeAPIKey} updateAPIName={updateName}/>
            </div>
            <br/>
            <AddAPIKeyButton createAPIKey={createAPIKey}/>
            <form action={backToProfile}>
                <button type="submit" className="text-gray-900 bg-white border border-gray-400 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm w-[205px] py-2.5 mt-2">Back to Profile</button>
            </form>


        </div>
        <footer className="copyright-footer profile-api">
                <p>
                    &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
                </p>
            </footer>
        </div>
    );
}