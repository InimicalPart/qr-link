"use client";

import { useFormState, useFormStatus } from 'react-dom'
import "./test.css"

import Actions from './actions.client';
import Settings from './settings.client';
import FormSubmit from './form-submit.client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';


const initialState: {
    id: string | null,
    update_key: string | null,
    name: string | null,
    description: string | null,
    expires: string | Date | null,
    expires_never_checkbox: boolean | string | null,
    grab_device_fingerprint: boolean | string | null,
    grab_timestamp: boolean | string | null,
    grab_ip_address: boolean | string | null,
    grab_user_agent: boolean | string | null,
    grab_location: boolean | string | null,
    require_location: boolean | string | null,
    send_to_redirect: boolean | string | null,
    jwt_singing_key: string | null,
    type: string | null,
    redirect_redirect_to: string | null,
    redirect_after_expiry: string | null,
    schedule: string | null,
    schedule_timezone: string | null,
    location_zones: string | null,
    submit_button: string | null

} = {
    id: null,
    update_key: null,
    name: null,
    description: null,
    expires: null,
    expires_never_checkbox: null,
    grab_device_fingerprint: null,
    grab_timestamp: null,
    grab_ip_address: null,
    grab_user_agent: null,
    grab_location: null,
    require_location: null,
    send_to_redirect: null,
    jwt_singing_key: null,
    type: null,
    redirect_redirect_to: null,
    redirect_after_expiry: null,
    schedule: null,
    schedule_timezone: null,
    location_zones: null,
    submit_button: null


}


export default function Form({
    submit
}:{
    submit: (prevState:any,form:FormData) => any
}) {
    const [state, formAction] = useFormState(submit, initialState)

    useEffect(()=>{
        if (state?.success) {
            alert("Successfully created QR Code\n\nID: " + state?.success?.id + "\nUpdate Key: " + state?.success?.update_key)
            redirect("/dashboard")
        }
    },[state])



    return (
        <form id="create-form" action={formAction}>
        <div id="qr-id-cntr" className="QRL-container">
            <p className="qr-info-label flex justify-center items-center flex-wrap"><b>ID</b> <span style={{
                fontSize: '8pt',
                flexBasis: '100%',
                marginTop: -5
            }}>(optional)</span></p>
            <input className="create" id="qr-id" name="id" style={{
                width: 300,
                border: state?.id ? "1px red solid" : '1px black solid',
                borderRadius: 8,
                textAlign: 'center'
            }} autoCapitalize="false" spellCheck="false" type="text" placeholder="Leave blank for random" maxLength={50}/>
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                fontSize: "9pt",
                color: "red",
                display: state?.id ? "block" : "none"
            }}>{state?.id}</p>
        </div>
        <div id="qr-updatekey-cntr" className="QRL-container">
            <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Update Key</b> <span style={{
                fontSize: '8pt',
                flexBasis: '100%',
                marginTop: -5
            }}>(optional)</span></p>
            <input className="create" id="qr-updatekey" name="update_key" style={{
                width: 300,
                border: state?.update_key ? "1px red solid" : '1px black solid',
                borderRadius: 8,
                textAlign: 'center'
            }} autoCapitalize="false" spellCheck="false" type="password" placeholder="Leave blank for random" maxLength={100}/>
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                fontSize: "9pt",
                color: "red",
                display: state?.update_key ? "block" : "none"
            }}>{state?.update_key}</p>
        </div>
        <div id="qr-name-cntr" className="QRL-container">
            <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Name</b><span style={{
                fontSize: '8pt',
                flexBasis: '100%',
                marginTop: -5
            }}>(optional)</span></p>
            <input className="create" id="qr-name" name="name" style={{
                width: 300,
                border: state?.name ? "1px red solid" : '1px black solid',
                borderRadius: 8,
                textAlign: 'center'
            }} type="text" maxLength={50}/>
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                fontSize: "9pt",
                color: "red",
                display: state?.name ? "block" : "none"
            }}>{state?.name}</p>
        </div>
        <div id="qr-description-cntr" className="QRL-container">
            <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Description</b><span style={{
                fontSize: '8pt',
                flexBasis: '100%',
                marginTop: -5
            }}>(optional)</span></p>
            <textarea id="qr-description" name="description" style={{
                width: 300,
                border: state?.description ? "1px red solid" : '1px black solid',
                borderRadius: 8,
                textAlign: 'center',
                height: 150,
                maxHeight: 400
            }} maxLength={200}></textarea>
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                fontSize: "9pt",
                color: "red",
                display: state?.description ? "block" : "none",
                marginTop: -5
            }}>{state?.description}</p>
        </div>
        <div id="qr-expires-cntr" className="QRL-container">
            <p className="qr-info-label flex justify-center items-center flex-wrap"><b>Expires</b></p>
            <input id="qr-expires" name="expires" className="create disabled:bg-neutral-400" style={{
                border: '1px black solid',
                borderRadius: 8,
                textAlign: 'center'
            }} disabled type="datetime-local"/>
            <input className="create" name="expires_never_checkbox" style={{
                marginLeft: 10
            }} id="qr-never-expires-checkbox" type="checkbox" defaultChecked/>
            <label style={{marginLeft:5}} htmlFor="qr-never-expires-checkbox">Never</label>
        </div>
        {/* TODO Make it so you can choose what you want instead of only redirect */}
        
        <Settings state={state}/>

        <Actions state={state}/>

        <FormSubmit state={state}/>
    </form>
    )
}





