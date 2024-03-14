import { getUser } from "@/utilities/api/v1/authentication";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";

import "./api.css"
import APIKeyGenerator from "@/components/user/profile/api/generator.client";
import { deleteAPIKey, updateAPIKeyName } from "@/utilities/api/v1/database";
import { QRLinkGlobal } from "@/types/api/v1/global";

declare const global: QRLinkGlobal

export default async function UserAPI() {

    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    const user = await getUser(cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

    async function revokeAPIKey(id:string) {
        "use server";
        const key = global.APIKeyTable[id]

        if (key.belongs_to === user.user.id) {
            return await deleteAPIKey(id)
        }
        return false
    }

    async function updateName(id:string, name:string) {
        "use server";

        const key = global.APIKeyTable[id]

        if (key.belongs_to === user.user.id) {
            return await updateAPIKeyName(id, name)
        }

        return false
    }

    return (
        <div style={{
            position:"absolute",
            left:"50%",
            top: "40%",
            transform:"translate(-50%,-40%)",
            width: "fit-content",
            height:"fit-content",

            display:"flex",
            flexDirection:"column",
            alignItems:"center",
            justifyContent:"center",
            
        }}>
            <p className="font-extrabold text-xl md:text-2xl lg:text-3xl mb-2">QRLink API keys for {user.user.firstName}</p>
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

            }}>

                <APIKeyGenerator API_URL={process.env.API_URL} token={cookies().get("token").value} onRevoke={revokeAPIKey} updateAPIName={updateName}/>

            </div>

        </div>
    );
}