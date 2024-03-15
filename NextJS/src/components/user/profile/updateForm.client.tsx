"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
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
                <button className="font-medium" style={{
                    background: "linear-gradient(to right, red, purple)",
                    padding:"10px 20px",
                    maxWidth: 220,
                    maxHeight: 220,
                    borderRadius: "18px",
                    marginTop: 20,
                    color:"white"
                }} type="submit">Update</button>
                <p style={{
                    color:"red",
                    display: state?.default ? "block" : "none"
                }}>{state?.default}</p>
        </form>
    )

}