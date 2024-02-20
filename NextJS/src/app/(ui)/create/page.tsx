// "use server"

import Script from "next/script";
import "./create.css"
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { z } from 'zod'

const API_URL = (process.env.API_URL ?? "http://localhost:8080/api/v1")
let secret = new Uint8Array(
    Buffer.from(process.env.JWT_SECRET, 'base64'),
    );
// import CreateQR from "@/components/create/createqr.client";
import Form from "@/components/create/form.client";
import React, { useState } from 'react'
import Head from "next/head";
import Alerts from "@/components/all/alerts.client";

export default async function Home() {
    if (cookies()?.get("token")?.value) {
        let valid = false
        await jwtVerify(cookies().get("token").value, secret).then(()=>{
            valid = true
        }).catch(()=>{
            valid = false
        })
        if (!valid) redirect("/login")
    } else {
        redirect("/login")
    }
    console.log("valid")

    
    return (
      <div>
        <Alerts/>
        <span id="apiurl" style={{ display: "none" }}>{process.env.API_URL ?? "http://localhost:8080/api/v1"}</span>
        <div id="create-new">
            <div style={{
                width: 200,
                height: 200,
                left: '50%',
                marginTop: 50,
                position: 'relative',
                transform: 'translateX(-50%)'
            }}>
                <div id="qr-code" className="select-none"></div>
            </div>
            <div id="qr-info" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                position: 'relative',
                top: 50
            }} className="select-none">
                    <Form submit={submit}/>
            </div>
        </div>
    </div>);
}






const createSchema = z.object({
    id: z.string({
            invalid_type_error: "ID must be a string"
        }).max(50, {
            message: "ID must be at most 50 characters"
        }).nullable(),
    updateKey: z.string().max(100, {
        message: "Update Key must be at most 100 characters"
    }).nullable(),
    name: z.string().max(50, {
        message: "Name must be at most 50 characters"
    }).nullable(),
    description: z.string().max(200, {
        message: "Description must be at most 200 characters"
    }).nullable(),
    expires: z.date().nullable(),
    expires_never_checkbox: z.string().nullable(),
    grab_scan_data: z.string().nullable(),
    grab_device_fingerprint: z.string().nullable(),
    grab_timestamp: z.string().nullable(),
    grab_ip_address: z.string().nullable(),
    grab_user_agent: z.string().nullable(),
    grab_location: z.string().nullable(),
    require_location: z.string().nullable(),
    send_to_redirect: z.string().nullable(),
    jwt_singing_key: z.string().max(100, {
        message: "JWT Signing Key must be at most 100 characters"
    }).nullable(),
    type: z.string().min(1,{
        message: "You need to specify an action"
    }),
    
    redirect_redirect_to: z.string().min(1,{
        message: "Redirect to must be at least 1 character"
    }).nullable(),    
    redirect_after_expiry: z.string().nullable(),

    schedule: z.string().nullable(),
    schedule_timezone: z.string({
        required_error: "Timezone needs to be specified"
    }).nullable()
    
})

async function submit(prevState: any,form:FormData) {
    "use server"


    console.log(form.entries())
    const validatedFields = createSchema.safeParse({
        id: form.get('id'),
        updateKey: form.get('update_key'),
        name: form.get('name'),
        description: form.get('description'),
        expires: form.get('expires'),
        expires_never_checkbox: form.get('expires_never_checkbox'),
        grab_scan_data: form.get('grab_scan_data'),
        grab_device_fingerprint: form.get('grab_device_fingerprint'),
        grab_timestamp: form.get('grab_timestamp'),
        grab_ip_address: form.get('grab_ip_address'),
        grab_user_agent: form.get('grab_user_agent'),
        grab_location: form.get('grab_location'),
        require_location: form.get('require_location'),
        send_to_redirect: form.get('send_to_redirect'),
        jwt_singing_key: form.get('jwt_singing_key'),
        type: form.get('type'),
        redirect_redirect_to: form.get('redirect_redirect_to'),
        redirect_after_expiry: form.get('redirect_after_expiry'),
        schedule: form.get('schedule'),
        schedule_timezone: form.get('schedule_timezone')
    })

    const keys = Array.from(form.keys())
    const values = Array.from(form.values())

    console.log("----------------------------")
    for (const valueIndex in values) {
        const key = keys[valueIndex]
        const value = values[valueIndex]
        console.log(key +": "+ value)
    }
    console.log("----------------------------")
    console.log(validatedFields)
    const additionalCheck = await additionalChecks(form)
    if (!validatedFields.success) {
        return {...(validatedFields as any).error.flatten().fieldErrors, ...(additionalCheck.errors??{})}
    }
    if (!additionalCheck.success) {
        return additionalCheck.errors
    }
    console.log("validated")
}


async function additionalChecks(form: FormData) {
    "use server"

    let returnData = {}

        // if grab_scan_data is checked, then at least one of the other grab_ fields must be checked
    if (form.get('grab_scan_data') === "on") {
            if (!form.get('grab_device_fingerprint') && !form.get('grab_timestamp') && !form.get('grab_ip_address') && !form.get('grab_user_agent') && !form.get('grab_location')) {
                returnData = {
                    ...returnData,
                    grab_scan_data: ["At least one of these fields must be checked"]
                }
            }
        }
    
        if (form.get("send_to_redirect") == "on") {
            if (!form.get("jwt_singing_key") || form.get("jwt_singing_key") == "") {
                returnData = {
                    ...returnData,
                    jwt_singing_key: ["This field is required"]
                }
            }
        }
        if (form.get("type") === "redirect") {
            if (form.get("redirect_redirect_to") == "" || !form.get("redirect_redirect_to")) {
                returnData = {
                    ...returnData,
                    redirect_redirect_to: ["This field is required"]
                }
            }
            if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(form.get("redirect_redirect_to") as string)) {
                returnData = {
                    ...returnData,
                    redirect_redirect_to: ["Must be a valid URL or vCard"]
                }
            }
            if (form.get("redirect_after_expiry") != "" && form.get("redirect_after_expiry")) {
                if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(form.get("redirect_after_expiry") as string)) {
                    returnData = {
                        ...returnData,
                        redirect_after_expiry: ["Must be a valid URL or vCard"]
                    }
                }
            }
        } else if (form.get("type") === "schedule") {
            try {JSON.parse(form.get("schedule") as string)} catch {returnData = { ...returnData, schedule: ["Invalid JSON"] }}
           
            const schedule = JSON.parse(form.get("schedule") as string) 
           
            if (Object.keys(schedule).length === 0) {
                returnData = {
                    ...returnData,
                    schedule: ["Must have at least one day"]
                }
            }
           
           
            for (let day in schedule) {
                if (day == "timezone") continue;
                if (Object.keys(schedule[day]).length <= 1 && !Object.keys(schedule[day]).includes("ALL_DAY")) {
                    returnData = {
                        ...returnData,
                        schedule: [`${day}: Must have at least one action.`]
                    }
                    break
                }
                if (Object.keys(schedule[day]).includes("ALL_DAY") && Object.keys(schedule[day]).length > 1) {
                    returnData = {
                        ...returnData,
                        schedule: [`${day}: Cannot have an all day event and other actions at the same time.`]
                    }
                    break;
                }

                for (let time in schedule[day]) {
                        if (schedule[day][time].redirect_to == "" || !schedule[day][time].redirect_to) {
                            returnData = {
                                ...returnData,
                                schedule: [`${day}.${time}.redirect_to is required`]
                            }
                            break
                        }
                        if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(schedule[day][time].redirect_to)) {
                            returnData = {
                                ...returnData,
                                schedule: [`${day}.${time}.redirect_to must be a valid URL or vCard.`]
                            }
                            break;
                        }

                        if (schedule[day][time].after_expiry != "" && schedule[day][time].after_expiry) {
                            if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(schedule[day][time].after_expiry)) {
                                returnData = {
                                    ...returnData,
                                    schedule: [`${day}.${time}.after_expiry must be a valid URL or vCard.`]
                                }
                                break;
                            }
                        }
                }
            }
        }



        if (Object.keys(returnData).length === 0) return {success: true}
        return {success: false, errors: returnData}
    
    

}