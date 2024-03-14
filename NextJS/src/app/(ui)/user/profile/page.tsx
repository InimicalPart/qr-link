import ProfilePicture from "@/components/index/profilePicture.client";
import ProfileUpdateForm from "@/components/user/profile/updateForm.client";
import { getUser, updateUser } from "@/utilities/api/v1/authentication";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Swal from "sweetalert2-ql";

    
export default async function UserProfile() {


    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    const user = await getUser(cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

    async function updateUserInformation(prevState:any, form: FormData) {
        "use server";
        const firstName = form.get("firstName").toString().trim()
        const lastName = form.get("lastName").toString().trim() === "" ? null : form.get("lastName").toString().trim()
        const email = form.get("email").toString().trim()

        if (firstName == "" || email == "") {
            return {
                default: "Invalid data"
            }
        }

        // email validation regex
        const emailValidation = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
        if (!emailValidation.test(email)) {
            return {
                email: "Invalid email"
            }
        }

        if (firstName !== user.user.firstName || lastName !== user.user.lastName || email !== user.user.email) {
            const newToken = await updateUser(user.user.id,{
                firstName,
                lastName,
                email
            })

            if (newToken) {
                cookies().set("token", newToken)
                return {
                    success: "User updated"
                }
            } else {
                return {
                    default: "Failed to update user"
                }
            }

        }

    }

    async function goToManageAPIKeys() {
        "use server";
        redirect("/user/api")
    }

    return (
        <div style={{
            position:"relative",
            left:"50%",
            transform:"translateX(-50%)",
            width: "fit-content",
            height:"fit-content",
            marginTop:20,
            display:"flex",
            flexDirection:"column",
            alignItems:"center",
            justifyContent:"center",
            
        }}>
            <div style={{
                background: "linear-gradient(to right, red, purple)",
                padding:"10px",
                maxWidth: 220,
                maxHeight: 220,

                borderRadius: "10vh",
            }}>
                <ProfilePicture src={user.user.profilePictureUrl??
                "https://ui-avatars.com/api/?name="+user.user.firstName+(user.user.lastName ? "+"+user.user.lastName : "")+"&background=random"
                } width={200} height={200}/>
            </div>

            <br/>
            <p className="font-bold text-2xl">{user.user.firstName}</p>
            <br/>
            <ProfileUpdateForm action={updateUserInformation} user={user.user}/>
            <br/>
            <br/>
            <br/>
            <div id="buttons" style={{
                width: "fit-content",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                justifyContent:"center",
                flexWrap:"wrap",
                border: "1px solid black",
                padding: "30px",
                borderRadius: "15px",
                gap: "10px",
            }}>
                <form action={goToManageAPIKeys}>
                    <button type="submit" className="text-gray-900 bg-white border border-gray-400 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-10 py-2.5">Manage API Keys</button>
                </form>
            </div>
        </div>
    );
}