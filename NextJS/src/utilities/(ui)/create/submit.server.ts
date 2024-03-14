import { QRCode } from "@/utilities/api/v1/qrcode"
import moment from "moment-timezone"
import { cookies } from "next/headers"
import { z } from "zod"


export async function submit(submitType="create", qrCodeInfo:any={}, prevState: any, form:FormData) {
    "use server"

    const createSchema = z.object({
        name: z.string().max(50, {
            message: "Name must be at most 50 characters"
        }).nullable(),
        description: z.string().max(200, {
            message: "Description must be at most 200 characters"
        }).nullable(),
        expires: z.string().nullable(),
        expires_never_checkbox: z.string().nullable(),
        grab_scan_data: z.string().nullable(),
        grab_device_fingerprint: z.string().nullable(),
        grab_ip_address: z.string().nullable(),
        grab_user_agent: z.string().nullable(),
        grab_location: z.string().nullable(),
        require_location: z.string().nullable(),
        require_user_agent: z.string().nullable(),
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
        }).nullable(),
        location_zones: z.string().nullable(),
        user_agents: z.string().nullable(),
        timezone: z.string().refine(value=>moment.tz.zone(value) != null, {
            message: "Invalid timezone"
        }).nullable()
        
    })

    const validatedFields = createSchema.safeParse({
        name: form.get('name'),
        description: form.get('description'),
        expires: form.get('expires'),
        expires_never_checkbox: form.get('expires_never_checkbox'),
        grab_scan_data: form.get('grab_scan_data'),
        grab_device_fingerprint: form.get('grab_device_fingerprint'),
        grab_ip_address: form.get('grab_ip_address'),
        grab_user_agent: form.get('grab_user_agent'),
        grab_location: form.get('grab_location'),
        require_location: form.get('require_location'),
        require_user_agent: form.get('require_user_agent'),
        send_to_redirect: form.get('send_to_redirect'),
        jwt_singing_key: form.get('jwt_singing_key'),
        type: form.get('type'),
        redirect_redirect_to: form.get('redirect_redirect_to'),
        redirect_after_expiry: form.get('redirect_after_expiry'),
        schedule: form.get('schedule'),
        schedule_timezone: form.get('schedule_timezone'),
        location_zones: form.get('location_zones'),
        user_agents: form.get('userAgents'),
        timezone: form.get('timezone') //! used for 'expires'
    })

    const additionalCheck = await additionalChecks(form)
    if (!validatedFields.success) {
        return {...(validatedFields as any).error.flatten().fieldErrors, ...(additionalCheck.errors??{})}
    }
    if (!additionalCheck.success) {
        return additionalCheck.errors
    }

    //! Correctly format all data
    const name = validatedFields.data.name == "" ? null : validatedFields.data.name
    const description = validatedFields.data.description == "" ? null : validatedFields.data.description
    const expires = validatedFields.data.expires_never_checkbox == "on" ? null : validatedFields.data.expires
    const grabScanData = validatedFields.data.grab_scan_data == "on"
    const grabDeviceFingerprint = validatedFields.data.grab_device_fingerprint == "on"
    const grabIpAddress = validatedFields.data.grab_ip_address == "on"
    const grabUserAgent = validatedFields.data.grab_user_agent == "on"
    const grabLocation = validatedFields.data.grab_location == "on"
    const requireLocation = validatedFields.data.require_location == "on"
    const requireUserAgent = validatedFields.data.require_user_agent == "on"
    const sendToRedirect = validatedFields.data.send_to_redirect == "on"
    const jwtSigningKey = validatedFields.data.jwt_singing_key == "" ? null : validatedFields.data.jwt_singing_key
    const type = validatedFields.data.type
    const data = (() => {
        if (type == "redirect") {
            return {
                redirect_to: validatedFields.data.redirect_redirect_to.trim(),
                after_expiry: validatedFields.data.redirect_after_expiry.trim()
            }
        } else if (type == "schedule") {
            return {
                ...(JSON.parse(validatedFields.data.schedule)),
                timezone: validatedFields.data.schedule_timezone
            }
        } else if (type == "location") {
            return {
                zones: JSON.parse(validatedFields.data.location_zones)
            }
        } else if (type == "user-agent") {
            return {
                userAgents: JSON.parse(validatedFields.data.user_agents)
            }
        }
    })();
    const timezone = validatedFields.data.timezone

    const JSONBody: Partial<QRCode> = {
        name: name,
        description: description,
        expires: expires ? new Date(expires): null,
        settings: {
            getScanData: grabScanData,
            scanData: {
                information: {
                    fingerprint: grabDeviceFingerprint,
                    "user-agent": grabUserAgent,
                    ip: grabIpAddress,
                    location: grabLocation
                },
                sendToURL: sendToRedirect,
                JWTEncryptionKey: jwtSigningKey
            },
            requirements: {
                location: requireLocation,
                "user-agent": requireUserAgent
            }
        },
        type: type,
        data: data
    }

    //! If we are updating the QR code, we need to send it to (PATCH) /qrcode/:id
    //! If we are creating a new QR code, we need to send it to (POST) /qrcode
    const response = await fetch(`${(process.env.API_URL)}/qrcode` + (submitType=="update"?"/"+qrCodeInfo.id:""), {
        method: submitType=="update"?"PATCH":"POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `${cookies().get("token").value}`
        },
        body: JSON.stringify({...JSONBody, timezone}),
        cache: "no-cache"
    })
    const responseData = await response.json()

    //! Process the server response
    if (!response.ok) {
        if (responseData.error) {
            switch (responseData.error) {
                case "INVALID_TOKEN":
                    return {
                        submit_button: "Invalid token was provided. Please log in again."
                    }
                case "UNSUPPORTED_TYPE":
                    return {
                        type: ["Unsupported type"]
                    }
                case "INVALID_ID":
                    return {
                        id: [responseData.message]
                    }
                case "INVALID_DESCRIPTION":
                    return {
                        description: ["An invalid description was provided."]
                    }
                case "INVALID_NAME":
                    return {
                        name: ["An invalid name was provided."]
                    }
                case "INVALID_SCHEDULE":
                    return {
                        schedule: [responseData.message]
                    }
                case "NO_UPDATE":
                    return {
                        submit_button: "No update was provided"
                    }
                default:
                    console.log(responseData)
                    console.error("An unknown error occurred")
                    return {
                        submit_button: `UNKNOWN ERROR: ${responseData.message} (${responseData.error})`
                    }
            }
        } else {
            console.log(responseData)
            console.error("An unknown error occurred")
            return {
                "submit_button": "An unknown error occurred. Please try again later."
            }
        }
    } else {
        return {
            success: {
                id: responseData.id,
            }
        }
    }

}


async function additionalChecks(form: FormData) {
    "use server"

    let returnData = {}

    //! If grabbing information from each scan, at least one grab choice must be selected
    if (form.get('grab_scan_data') == "on") {
        if (!form.get('grab_device_fingerprint') && !form.get('grab_ip_address') && !form.get('grab_user_agent') && !form.get('grab_location')) {
            returnData = {
                ...returnData,
                grab_scan_data: ["At least one of these fields must be checked"]
            }
        }
        //! If location is required, but not grabbing location from the scan, return an error
    } else if (form.get("require_location") == "on" && form.get("grab_location") != "on") {
        returnData = {
            ...returnData,
            grab_scan_data: ["Location must be grabbed if it is required"]
        }
    }
    
    //! A JWT signing key is required if send_to_redirect is checked
    if (form.get("send_to_redirect") == "on") {
        if (!form.get("jwt_singing_key") || form.get("jwt_singing_key") == "") {
            returnData = {
                ...returnData,
                jwt_singing_key: ["This field is required"]
            }
        }
    }







    //! Specific checks for each type of QR-code action
    if (form.get("type") == "redirect") {
        //! 'redirect_to' has to be provided
        if (form.get("redirect_redirect_to") == "" || !form.get("redirect_redirect_to")) {
            returnData = {
                ...returnData,
                redirect_redirect_to: ["This field is required"]
            }
        //! 'redirect_to' has to be a valid URL or vCard
        } else if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(form.get("redirect_redirect_to") as string)) {
            returnData = {
                ...returnData,
                redirect_redirect_to: ["Must be a valid URL or vCard"]
            }
        }
        //! 'after_expiry' has to be a valid URL or vCard if provided
        if (form.get("redirect_after_expiry") != "" && form.get("redirect_after_expiry")) {
            if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(form.get("redirect_after_expiry") as string)) {
                returnData = {
                    ...returnData,
                    redirect_after_expiry: ["Must be a valid URL or vCard"]
                }
            }
        }
    } else if (form.get("type") == "schedule") {
        //! 'schedule' has to be a valid stringified JSON object
        try {JSON.parse(form.get("schedule") as string)} catch {returnData = { ...returnData, schedule: ["Invalid JSON"]}; }
        if (!(returnData as any).schedule) {

            const schedule = JSON.parse(form.get("schedule") as string) 
            
            //! Needs to have at least one day specified
            if (Object.keys(schedule).length === 0) {
                returnData = {
                    ...returnData,
                    schedule: ["Must have at least one day"]
                }
            }
        
        
            for (let day in schedule) {
                //! If only 1 time is specified in a day...
                if (Object.keys(schedule[day]).length == 1 && Object.keys(schedule).length == 1) {
                
                    //! ...and the time is not an all day event, return an error
                    if (!Object.keys(schedule[day]).includes("ALL_DAY")) {
                        returnData = {
                            ...returnData,
                            schedule: [`'${day}': Must have at least 2 times specified or 1 "all day" time.`]
                        }
                        break
                
                    //! ...and the time is an all day event, return an error if there are less than 2 days specified
                    } else { 
                        returnData = {
                            ...returnData,
                            schedule: [`Two days have to be specified if 1 day is an all day event.`]
                        }
                        break
                    }
                }

                //! If an all day event is specified and there are other times specified, return an error
                if (Object.keys(schedule[day]).includes("ALL_DAY") && Object.keys(schedule[day]).length > 1) {
                    returnData = {
                        ...returnData,
                        schedule: [`${day}: Cannot have an all day event and other times specified at the same time.`]
                    }
                    break;
                }

                for (let time in schedule[day]) {

                    //! 'redirect_to' has to be provided for each time specified
                    if (schedule[day][time].redirect_to == "" || !schedule[day][time].redirect_to) {
                        returnData = {
                            ...returnData,
                            schedule: [`${day}.${time}.redirect_to is required`]
                        }
                        break
                    }

                    //! 'redirect_to' has to be a valid URL or vCard
                    if (!/^(BEGIN:VCARD.*END:VCARD$|http(s|):\/\/|.*?\..*?)/gm.test(schedule[day][time].redirect_to)) {
                        returnData = {
                            ...returnData,
                            schedule: [`${day}.${time}.redirect_to must be a valid URL or vCard.`]
                        }
                        break;
                    }

                    //! 'after_expiry' has to be a valid URL or vCard if provided
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
    }


    if (moment.tz.zone(form.get("timezone") as string) == null) {
        returnData = {
            ...returnData,
            timezone: ["Invalid timezone"]
        }
    }


    if (Object.keys(returnData).length === 0) return {success: true}
    return {success: false, errors: returnData}
}