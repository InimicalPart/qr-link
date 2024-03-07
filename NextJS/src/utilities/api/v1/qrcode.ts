import moment from "moment-timezone";
import { getPassedTime } from "./misc";
import { SignJWT } from "jose";

export class QRCode {

    id: string;
    type: string;
    data: RedirectQRCodeDataT|ScheduleQRCodeDataT|LocationQRCodeDataT|UserAgentQRCodeDataT;
    update_key: string;
    linked_to: string | null = null;
    created: Date = new Date();
    updated: Date = new Date();
    expires: Date | null;
    description: string | null = null;
    name: string | null = null;
    settings: {
        requirements: {
            location: boolean;
            "user-agent": boolean;
        };
        scanData: {
            information: {
                fingerprint: boolean;
                "user-agent": boolean;
                timestamp: boolean;
                ip: boolean;
                location: boolean;
            };
            sendToURL: boolean;
            JWTEncryptionKey: string;
        };
        getScanData: boolean;

    }={
        requirements: {
            location: false,
            "user-agent": false,
        },
        scanData: {
            information: {
                fingerprint: false,
                "user-agent": false,
                timestamp: true,
                ip: false,
                location: false
            },
            sendToURL: false,
            JWTEncryptionKey: ""
        },
        getScanData: true
    };
    scanCount: number = 0;
    scanData: ({
        fingerprint?: string;
        "user-agent"?: string;
        timestamp?: Date;
        ip?: string;
        location?: {
            latitude: number;
            longitude: number;
            accuracy: number;
        };
    }| object)[] = [];
    update_log: {
        date: Date;
        update: {
            [key:string]: any
        };
    }[] = [];



    addToUpdateLog(update: Partial<QRCode>, time: Date = new Date()) {

        this.update_log.push({
            date: time,
            update: Object.assign({},update as object)
        })
    }

    // private getKeys(obj: object, prefix?: string): string[] {
    //     let keys = Object.keys(obj) as (keyof object)[]
    //     let rtrn = []
    //     for (let key of keys) {
    //         if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
    //             console.log(key)
    //             rtrn.push(...this.getKeys(obj[key], prefix ? prefix + "." + key : key))
    //         } else {
    //             rtrn.push(prefix ? prefix + "." + key : key)
    //         }
    //     }
    //     return rtrn
    // }

    constructor(newInformation?: Partial<QRCode> | undefined) {
        if (newInformation) Object.assign(this, newInformation)
        this.addToUpdateLog({
            created: this.created
        })
    }


    async signScanData(scanData: { fingerprint: any; location: any; timestamp: Date; "user-agent": string; ip: string; }) {
        return this.hasSendToURL() ? await new SignJWT({
            scanData
          })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setIssuedAt()
            .setExpirationTime('1m') //! 1 minute, should be enough for the other end to verify the JWT
            .sign(new Uint8Array(Buffer.from(this.getEncryptionKey(), 'base64'),)) : null
    }

    hasLocationRequirement() {
        return this.settings.requirements.location && this.settings.getScanData && this.settings.scanData.information.location 
    }

    hasUserAgentRequirement() {
        return this.settings.getScanData && this.settings.scanData.information["user-agent"]
    }

    hasSendToURL() {
        return this.settings.scanData.sendToURL && this.settings.scanData.JWTEncryptionKey
    }
    
    getEncryptionKey() {
        return this.hasSendToURL() ? this.isBase64(this.settings.scanData.JWTEncryptionKey) ? this.settings.scanData.JWTEncryptionKey : Buffer.from(this.settings.scanData.JWTEncryptionKey).toString("base64") : null
    }

    private isBase64(str: string) {
        return Buffer.from(str, 'base64').toString('base64') === str;
    }
    
    getScanDataSettings() {
        return {...this.settings.scanData.information,location_required: this.hasLocationRequirement(), user_agent_required: this.hasUserAgentRequirement()}
    }
    
    wantsScanData() {
        return this.settings.getScanData
    }

    isExpired() {
        return this.expires ? new Date() > new Date(this.expires) : false
    }

    hasAfterExpiry() {
        return JSON.stringify(this.data).includes("after_expiry")
    }

    getRedirectTo(scanData?: {
        latitude: number;
        longitude: number;
        accuracy: number;
    } | string) {
        let currentAction: Partial<RedirectQRCodeDataT> = {}

        if (this.type == "redirect") {
            const data = this.data as unknown as RedirectQRCodeDataT
            currentAction = data;
        } else if (this.type == "schedule") {
            const data = this.data as unknown as ScheduleQRCodeDataT
            console.log(data.timezone)

            let day = moment().tz(data.timezone ?? moment.tz.guess()).format("dddd").toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
            let time = getPassedTime(Object.keys(data[day]), data.timezone ?? moment.tz.guess())
            if (!time) {
                let currentDay = moment().tz(data.timezone ?? moment.tz.guess())
                // go back a day and try again
                let maxiumumDaysToGoBack = 7
                while (!time) {
                    currentDay.subtract(1, "days")
                    day = currentDay.format("dddd").toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
                    time = getPassedTime(Object.keys(data[day] as any), data.timezone ?? moment.tz.guess())
        
                    maxiumumDaysToGoBack--
                    if (maxiumumDaysToGoBack == 0) {
                        console.log("[QRCode] No valid schedule found for QR-code " + this.id + "!!")
                        throw new Error("No valid schedule found for QR-code " + this.id)
                    }
                }
            } 
            currentAction = data[day][time]
        } else if (this.type == "location") {
            const locationData = scanData as { latitude: number; longitude: number; accuracy: number; }
            if (!scanData) {
                throw new Error("Location data is required for this QR code.")
            }

            const data = this.data as unknown as LocationQRCodeDataT
            
            const zones = data.zones.toSorted((a,b) => b.priority - a.priority) // sort by priority (highest first)
            let currentZone = zones.find(zone => {
                if (zone.isEntireWorld) return true
                if (zone.type == "circle") {
                    return getDistanceFromLatLonInMeters(locationData.latitude, locationData.longitude, zone.center[0], zone.center[1]) <= zone.radius;
                } else if (zone.type == "polygon") {
                    return this.isPointInPolygon(locationData, zone.positions)
                }
            })

            if (!currentZone) {
                return "nil" // no valid zone found
            } else {
                console.log("[QRCode] Zone " + currentZone.type+"-"+currentZone.priority+"-"+currentZone?.positions?.length + " found for QR-code " + this.id + "!!")
                console.log("[QRCode] User is at " + locationData.latitude + "," + locationData.longitude)
                if (currentZone.isEntireWorld) {
                    console.log("[QRCode] Zone is the entire world.")
                } else if (currentZone.type == "circle") {
                    console.log("[QRCode] Zone is a circle with a radius of " + currentZone.radius + " meters and a center at " + currentZone.center[0] + "," + currentZone.center[1])
                    console.log("[QRCode] User is " + getDistanceFromLatLonInMeters(locationData.latitude, locationData.longitude, currentZone.center[0], currentZone.center[1]) + " meters away from the center.")
                } else if (currentZone.type == "polygon") {
                    console.log("[QRCode] Zone is a polygon with " + currentZone.positions.length + " points.")
                    console.log("[QRCode] User is " + (this.isPointInPolygon(locationData, currentZone.positions) ? "" : "not ") + "inside the polygon.")
                }
            }


            currentAction.redirect_to = currentZone.redirectTo
            currentAction.after_expiry = currentZone.afterExpiry
        } else if (this.type == "user-agent") {
            const data = (this.data as unknown as UserAgentQRCodeDataT).userAgents.toSorted((a, b) => {
                //! Set "Any (fallback)" (/.*/ & /.*/) to the end of the list
                if (a.browser === "/.*/" && a.os === "/.*/") {
                    return 1;
                } else if (b.browser === "/.*/" && b.os === "/.*/") {
                    return -1;
                } else {
                    return 0;
                }
            });
            if (!scanData) {
                throw new Error("User agent data is required for this QR code.")
            }
            const userAgent = scanData as string

            for (let userAgentInformation of data) {
                let browserRegexOptions = userAgentInformation.browser.split("/").pop()
                let OSRegexOptions = userAgentInformation.browser.split("/").pop()

                // remove the starting and ending slashes including the options
                let browserRegex = userAgentInformation.browser.split("/").slice(1, -1).join("/")
                let OSRegex = userAgentInformation.os.split("/").slice(1, -1).join("/")



                if (new RegExp(browserRegex, browserRegexOptions).test(userAgent) && new RegExp(OSRegex, OSRegexOptions).test(userAgent)) {
                    currentAction.redirect_to = userAgentInformation.redirect_to
                    currentAction.after_expiry = userAgentInformation.after_expiry
                    break;
                }
            }

            if (!currentAction.redirect_to) {
                return "nil"
            }
            
        }

        // if redirect_to doesnt start with http:// or https://, add http
        if (currentAction.redirect_to && !currentAction.redirect_to.startsWith("http://") && !currentAction.redirect_to.startsWith("https://") &&
            // not a vcard
            !(currentAction.redirect_to.startsWith("BEGIN:VCARD") && currentAction.redirect_to.endsWith("END:VCARD"))) {
            currentAction.redirect_to = "http://" + currentAction.redirect_to
        }
        // if after_expiry doesnt start with http:// or https://, add http
        if (currentAction.after_expiry && !currentAction.after_expiry.startsWith("http://") && !currentAction.after_expiry.startsWith("https://")&&
            // not a vcard
            !(currentAction.after_expiry.startsWith("BEGIN:VCARD") && currentAction.after_expiry.endsWith("END:VCARD"))) {
            currentAction.after_expiry = "http://" + currentAction.after_expiry
        }

        if (this.isExpired()) {
            if (currentAction.after_expiry) {
                return currentAction.after_expiry
            }
            return null        
        } else {
            return currentAction.redirect_to
        }

    }


    private getScannedLast(timeInSeconds:number, since=new Date()) {
        let timeAgo = new Date(since.getTime() - timeInSeconds*1000)
        let scans = this.scanData.filter((a: any)=>a.timestamp).filter((a: { timestamp?: Date }) => new Date(a.timestamp) > timeAgo && new Date(a.timestamp) < since)
        return scans.length
        
    }

    private getImportantMoments(from:Date, to: Date): {
        date: Date,
        update: {[key:string]:any},
    }[] {

        return this.update_log
            .filter((a: { date: Date; update: {[key:string]:any}}) => (a.date > from && a.date < to))
            .filter((a: { date: Date; update: {[key:string]:any}}) => Object.keys(a.update).some(b => b.startsWith("settings.scanData") || b == "id"))
        
    }

    private getWhereScanned() {
        let rtrn = []
        for (let scan of this.scanData as { location?: { latitude: number; longitude: number; accuracy: number; } }[]) {
            if (scan?.location) {
                rtrn.push([scan.location.latitude, scan.location.longitude, scan.location.accuracy])
            }
        }
        return rtrn
    }

    private getScannedDayRank(timezone: string) {
        // get all scans, show how many happened on each day of the week
        let rtrn = {
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0
        }
        for (let scan of this.scanData as { timestamp?: Date }[]) {
            if (scan.timestamp) {
                rtrn[moment(scan.timestamp).tz(timezone).format("dddd").toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"]++
            }
        }
        return rtrn
    }

    private getScannedTimeRank(timezone: string) {
        // get all scans, show how many happened at each hour of the day
        let rtrn: { [key: string]: number } = {};
        for (let i = 0; i < 24; i++) {
            let label = i.toString().padStart(2, '0') + ":00";
            rtrn[label] = 0;
        }
        for (let scan of this.scanData as { timestamp?: Date }[]) {
            if (scan.timestamp) {
                let hour = moment(scan.timestamp).tz(timezone).hour();
                let label = hour.toString().padStart(2, '0') + ":00";
                rtrn[label]++;
            }
        }
        return rtrn;
    }


    private getScannedEach(timeInSeconds: number) {
        // for every timeInSeconds back, get the amount of scans, then average it out
        let time = new Date()
        let totalScans = 0;
        let count = 0;
        while (time.getTime() > this.created.getTime()) {
            totalScans += this.getScannedLast(timeInSeconds,time);
            count++;
            time = new Date(time.getTime() - timeInSeconds*1000);
        }
        const averageScans = totalScans / count;
        return Math.floor(averageScans);
    }

    async getStatistics(type: "ScannedEachX" | "ScannedLastX" | "ScannedWhere" | "Scanned" | "ScannedDayRank" | "ScannedTimeRank", time: "minute" | "hour" | "day" | "week" | "month" | "year", timezone: string): Promise<{
        important_moments: {
            date: Date;
            update: {
                [key:string]: any
            }
        }[],
        info: number | number[] | number[][] | {
            monday: number;
            tuesday: number;
            wednesday: number;
            thursday: number;
            friday: number;
            saturday: number;
            sunday: number;
        } | {
            [key: string]: number
        } | {
            error: string,
            message: string
        }
    } | {
        error: string,
        message: string
    }> {

        if (this.scanData.length == 0) return {
            error: "NO_SCANS",
            message: "No scans have been made for this QR code."
        }

        let timeInSeconds = 0
        if (time) {
            switch (time) {
                case "minute":
                    timeInSeconds = 60
                    break;
                case "hour":
                    timeInSeconds = 60*60
                    break;
                case "day":
                    timeInSeconds = 60*60*24
                    break;
                case "week":
                    timeInSeconds = 60*60*24*7
                    break;
                case "month":
                    timeInSeconds = 60*60*24*30
                    break;
                case "year":
                    timeInSeconds = 60*60*24*365
                    break;
                default:
                    return {
                        error: "INVALID_TIME",
                        message: "Invalid time provided in request."
                    }
            }
        }

        if (!type) return {
            error: "NO_TYPE",
            message: "No type provided in request."
        }


        switch (type) {
            case "ScannedLastX":
                return {
                    info: this.getScannedLast(timeInSeconds),
                    important_moments: this.getImportantMoments(new Date(new Date().getTime() - timeInSeconds*1000), new Date())
                }
            case "ScannedEachX":
                return {
                    info: this.getScannedEach(timeInSeconds),
                    important_moments: this.getImportantMoments(new Date(new Date().getTime() - timeInSeconds*1000), new Date())
                }
            case "ScannedWhere":
                return {
                    info: this.getWhereScanned(),
                    important_moments: this.getImportantMoments(new Date(new Date().getTime() - timeInSeconds*1000), new Date())
                }
            case "Scanned":
                return {
                    info: this.scanCount,
                    important_moments: this.getImportantMoments(this.created, new Date())
                }
            case "ScannedDayRank":
                return {
                    info: this.getScannedDayRank(timezone),
                    important_moments: this.getImportantMoments(this.created, new Date())
                }
            case "ScannedTimeRank":
                return {
                    info: this.getScannedTimeRank(timezone),
                    important_moments: this.getImportantMoments(this.created, new Date())
                }
            default:
                return null

        }

    }




    private isPointInPolygon(locationData: { latitude: number; longitude: number; accuracy: number; }, positions: number[][]): boolean {
        let x = locationData.latitude, y = locationData.longitude
        let inside = false
        for (let i = 0, j = positions.length - 1; i < positions.length; j = i++) {
            let xi = positions[i][0], yi = positions[i][1]
            let xj = positions[j][0], yj = positions[j][1]
        
            let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
            if (intersect) inside = !inside
        }
        return inside
    }

}


export interface RedirectQRCodeDataT {
    redirect_to: string;
    after_expiry: string;
}
export interface ScheduleQRCodeDataT {
    "monday": {[key:string]:RedirectQRCodeDataT}
    "tuesday": {[key:string]:RedirectQRCodeDataT}
    "wednesday": {[key:string]:RedirectQRCodeDataT}
    "thursday": {[key:string]:RedirectQRCodeDataT}
    "friday": {[key:string]:RedirectQRCodeDataT}
    "saturday": {[key:string]:RedirectQRCodeDataT}
    "sunday": {[key:string]:RedirectQRCodeDataT}
    "timezone": string;
}

export interface LocationQRCodeDataT {
    zones: Array<{
        type: 'circle' | 'polygon';
        priority: number;
        isEntireWorld: boolean;
        positions?: number[][];
        center?: number[];
        radius?: number;
        redirectTo: string;
        afterExpiry: string;
    }>
}

export interface UserAgentQRCodeDataT {
    userAgents: Array<{
        browser: string;
        browser_name: string;
        os: string;
        os_name: string;
        redirect_to: string;
        after_expiry?: string;
    }>
}


export type DataT = Pick<QRCode, "data">;
export type SettingsT = Pick<QRCode, "settings">;
export namespace Types {
    export type Data = DataT;
    export type Settings = SettingsT;
    export type RedirectQRCodeData = RedirectQRCodeDataT;
    export type ScheduleQRCodeData = ScheduleQRCodeDataT;
    export type LocationQRCodeData = LocationQRCodeDataT;
    export type UserAgentQRCodeData = UserAgentQRCodeDataT;

}


function getDistanceFromLatLonInMeters(latitude: number, longitude: number, arg2: number, arg3: number) {
    var lat1 = latitude;
    var lon1 = longitude;
    var lat2 = arg2;
    var lon2 = arg3;
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c * 1000; // Distance in m
    return d;
}

function deg2rad(arg0: number) {
    return arg0 * (Math.PI / 180)
}

