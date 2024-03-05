"use client";

import { useFormState, useFormStatus } from 'react-dom'
import "./actions.css"

import Actions from './actions.client';
import Settings from './settings.client';
import FormSubmit from './form-submit.client';
import { useEffect, useState } from 'react';
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
    require_user_agent: boolean | string | null,
    send_to_redirect: boolean | string | null,
    jwt_singing_key: string | null,
    type: string | null,
    redirect_redirect_to: string | null,
    redirect_after_expiry: string | null,
    schedule: string | null,
    schedule_timezone: string | null,
    location_zones: string | null,
    userAgents: string | null,
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
    require_user_agent: null,
    send_to_redirect: null,
    jwt_singing_key: null,
    type: null,
    redirect_redirect_to: null,
    redirect_after_expiry: null,
    schedule: null,
    schedule_timezone: null,
    location_zones: null,
    userAgents: null,
    submit_button: null


}


export default function Form({
    submit,
    qrCodeInfo = {}
}:{
    submit: (prevState:any,form:FormData) => any,
    qrCodeInfo?: any
}) {
    const [state, formAction] = useFormState(submit, initialState)

    const [updateKeyShown, setUpdateKeyShown] = useState(false)


    const updating = qrCodeInfo?.id ? true : false
    useEffect(()=>{
        console.log(state)
        if (state?.success) {
            if (updating) {
                alert("Successfully updated QR Code\n\nID: " + state?.success?.id + "\nUpdate Key: " + state?.success?.update_key)
            } else {
                alert("Successfully created QR Code\n\nID: " + state?.success?.id + "\nUpdate Key: " + state?.success?.update_key)
            }
            redirect("/dashboard")
        }
    },[state,updating])

    let lastValue: string = null
    function handleNeverExpiresChange(evt: { target: { checked: any; }; }) {
        if (evt.target.checked) {
            (document.getElementById("qr-expires") as HTMLInputElement).disabled = true;
            lastValue = (document.getElementById("qr-expires") as HTMLInputElement).value;
            (document.getElementById("qr-expires") as HTMLInputElement).value = "";
        } else {
            if (!lastValue) lastValue = toDTFormat(new Date());
            (document.getElementById("qr-expires") as HTMLInputElement).disabled = false;
            (document.getElementById("qr-expires") as HTMLInputElement).value = lastValue;
        }
    
    }

    function handleIDChange(evt: { target: { value: string; }; }) {
        //is space? cancel
        if (evt.target.value.includes(" ")) {
            evt.target.value = evt.target.value.replace(/ /g, "")
            return
        }
        // if longer than 50, cancel
        if (evt.target.value.length > 50) {
            evt.target.value = evt.target.value.substring(0, 50)
            return
        }

        if ((!/^[a-zA-Z0-9_.-]*$/.test(evt.target.value))) {
            evt.target.value = evt.target.value.replace(/[^a-zA-Z0-9_.-]/g, "")
            return
        }
    }

    function toDTFormat(date: Date) {
        var padDate = function (num: number) {
            return (num < 10 ? "0" : "") + num;
        };
    
        return (
            date.getFullYear() +
            "-" +
            padDate(date.getMonth() + 1) +
            "-" +
            padDate(date.getDate()) +
            "T" +
            padDate(date.getHours()) +
            ":" +
            padDate(date.getMinutes())
        );
        }
    return (
        <form id="create-form" action={formAction} style={{
            position:"relative"
        }}>
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
                fontSize: 13,
                textAlign: 'center'
            }} autoCapitalize="false" spellCheck="false" type="text" placeholder="Leave blank for random" maxLength={50} onChange={handleIDChange} defaultValue={qrCodeInfo.id}/>
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
                fontSize: 13,
                textAlign: 'center'
            }} autoCapitalize="false" autoComplete="new-password" spellCheck="false" type={updateKeyShown?"text":"password"} onFocus={()=>setUpdateKeyShown(true)} onBlur={()=>setUpdateKeyShown(false)} placeholder="Leave blank for random" maxLength={100} defaultValue={qrCodeInfo.update_key}/>
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
            }} type="text" maxLength={50} defaultValue={qrCodeInfo.name}/>
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
            }} maxLength={200} defaultValue={qrCodeInfo.description}></textarea>
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
            }} disabled type="datetime-local" defaultValue={qrCodeInfo.expires}/>
            <input className="create" name="expires_never_checkbox" style={{
                marginLeft: 10
            }} id="qr-never-expires-checkbox" type="checkbox" onChange={handleNeverExpiresChange} defaultChecked={qrCodeInfo.expires==null?true:false ?? true}/>
            <label style={{marginLeft:5}} htmlFor="qr-never-expires-checkbox">Never</label>
        </div>
        
        <Settings state={state} qrCodeInfo={qrCodeInfo}/>

        <Actions state={state} qrCodeInfo={qrCodeInfo}/>

        <FormSubmit state={state} qrCodeInfo={qrCodeInfo}/>
    </form>
    )
}





