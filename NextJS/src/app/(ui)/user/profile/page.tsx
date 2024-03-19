import ProfilePicture from "@/components/index/profilePicture.client";
import ProfileUpdateForm from "@/components/user/profile/updateForm.client";
import { getUser, updateUser } from "@/utilities/api/v1/authentication";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Swal from "sweetalert2-ql";
import Image from "next/image";
import "./profile.css";
export default async function UserProfile() {


    //! Make sure the user is logged in
    if (!cookies()?.get("token")?.value) redirect("/login")
    let user = await getUser(cookies().get("token").value, { allowAPIKey:false })
    if (!user.isAuthenticated) redirect("/login")

    async function updateUserInformation(prevState:any, form: FormData) {
        "use server";
        const firstName = form.get("firstName").toString().trim()
        const lastName = form.get("lastName").toString().trim()
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
            const {token: newToken, user: newUser} = await updateUser(user.user.id,{
                firstName,
                lastName,
                email
            })

            
            if (newToken) {
                cookies().set("token", newToken)
                user = {
                    isAuthenticated: true,
                    user: newUser
                }
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

    async function backToDashboard() {
        "use server";
        redirect("/dashboard")
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

    return (
        <div className="profile main-container" style={{
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
            </header>            <div style={{
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

                    borderRadius: "100vh",
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
                        <button type="submit" className="text-gray-900 bg-white border border-gray-400 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm w-[210px] py-2.5">Manage API Keys</button>
                    </form>
                    <form action={backToDashboard}>
                        <button type="submit" className="text-gray-900 bg-white border border-gray-400 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm w-[210px] py-2.5">Back to Dashboard</button>
                    </form>
                </div>
            </div>
            <footer className="copyright-footer profile">
                <p>
                    &copy; 2024 - <a className="copyright" href="https://github.com/InimicalPart" target="_blank">InimicalPart</a> & <a className="copyright" href="https://newseed.se" target="_blank">NewSeed IT Solutions AB</a> - All rights reserved.
                </p>
            </footer>
        </div>
    );
}