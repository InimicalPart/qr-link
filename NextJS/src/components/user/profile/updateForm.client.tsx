"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Swal from "sweetalert2-ql";
import "@sweetalert2/theme-dark"

export default function ProfileUpdateForm({
    action,
    user
}:{
    action: (prevState:any,form:FormData) => any,
    user: User
}) {
    const initialState : {
        success: null,
        email: null
    } = {
        success: null,
        email: null
    }
    const [state, formAction] = useFormState(action, initialState)
    const { pending } = useFormStatus()

    useEffect(()=>{
        if (state?.success) {
            Swal.mixin({
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener("mouseenter", Swal.stopTimer)
                    toast.addEventListener("mouseleave", Swal.resumeTimer)
                }
            }).fire({
                title: "User updated",
                text: "Your user information has been updated",
                icon: "success"
            })
        }
    },[state])

    return (
        <form action={formAction} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width:"fit-content",
        }}>
                <label className="font-bold" htmlFor="firstName">First name</label>
                <input style={{border:"1px solid black", borderRadius:8,paddingLeft:5,textAlign:"center"}} type="text" name="firstName" placeholder="First name" defaultValue={user.firstName} required/>
                <label className="font-bold" htmlFor="lastName">Last name</label>
                <input style={{border:"1px solid black", borderRadius:8,paddingLeft:5,textAlign:"center"}} type="text" name="lastName" placeholder="Last name" defaultValue={user.lastName}/>
                <label className="font-bold" htmlFor="email">Email</label>
                <input style={{border:"1px solid black", borderRadius:8,paddingLeft:5,textAlign:"center"}} type="email" name="email" placeholder="Email" defaultValue={user.email} required/>
                <p style={{
                    color:"red",
                    display: state?.email ? "block" : "none"
                }}>Email already in use.</p>
                    <button disabled={pending} type="submit" className="text-gray-900 bg-white border border-gray-400 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 mt-5">{pending? "Saving..." :"Save Changes"}</button>
                <p style={{
                    color:"red",
                    display: state?.default ? "block" : "none"
                }}>{state?.default}</p>
        </form>
    )

}