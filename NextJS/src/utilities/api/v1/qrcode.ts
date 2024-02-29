import moment from "moment-timezone";
import { getPassedTime } from "./misc";
import { SignJWT } from "jose";

export class QRCode {

    id: string;
    type: string;
    data: RedirectQRCodeDataT|ScheduleQRCodeDataT|LocationQRCodeDataT
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
            location: false
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
        update: string[];
    }[] = [];



    addToUpdateLog(update: Partial<QRCode>, time: Date = new Date()) {
        let keys = this.getKeys(update)
        this.update_log.push({
            date: time,
            update: keys
        })
    }

    private getKeys(obj: object, prefix?: string): string[] {
        let keys = Object.keys(obj) as (keyof object)[]
        let rtrn = []
        for (let key of keys) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                console.log(key)
                rtrn.push(...this.getKeys(obj[key], prefix ? prefix + "." + key : key))
            } else {
                rtrn.push(prefix ? prefix + "." + key : key)
            }
        }
        return rtrn
    }

    constructor(newInformation?: Partial<QRCode> | undefined) {
        if (newInformation) Object.assign(this, newInformation)
    }


    async signScanData(scanData: { fingerprint: any; location: any; timestamp: Date; "user-agent": string; ip: string; }) {
        return this.hassendToURL() ? await new SignJWT({
            scanData
          })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setIssuedAt()
            .setExpirationTime('1m')
            .sign(new Uint8Array(Buffer.from(this.getEncryptionKey(), 'base64'),)) : null
    }

    hasLocationRequirement() {
        return this.settings.requirements.location && this.settings.getScanData && this.settings.scanData.information.location 
    }

    hassendToURL() {
        return this.settings.scanData.sendToURL && this.settings.scanData.JWTEncryptionKey
    }
    
    getEncryptionKey() {
        return this.hassendToURL() ? this.isBase64(this.settings.scanData.JWTEncryptionKey) ? this.settings.scanData.JWTEncryptionKey : Buffer.from(this.settings.scanData.JWTEncryptionKey).toString("base64") : null
    }

    private isBase64(str: string) {
        return Buffer.from(str, 'base64').toString('base64') === str;
    }
    
    getScanDataSettings() {
        return {...this.settings.scanData.information,location_required: this.hasLocationRequirement()}
    }
    
    wantsScanData() {
        return this.settings.getScanData
    }

    isExpired() {
        return this.expires ? new Date() > new Date(this.expires) : false
    }

    getRedirectTo(locationData?: { latitude: number; longitude: number; accuracy: number; }) {
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
            if (!locationData) {
                throw new Error("Location data is required for this QR code.")
            }

            const data = this.data as unknown as LocationQRCodeDataT
            
            const zones = data.zones.sort((a,b) => b.priority - a.priority) // sort by priority (highest first)
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
        }

        // if redirect_to doesnt start with http:// or https://, add http
        if (currentAction.redirect_to && !currentAction.redirect_to.startsWith("http://") && !currentAction.redirect_to.startsWith("https://") &&
            // not a vcard
            !(currentAction.redirect_to.startsWith("BEGIN:VCARD") && currentAction.redirect_to.endsWith("END:VCARD"))
            
        ) {
            currentAction.redirect_to = "http://" + currentAction.redirect_to
        }
        // if after_expiry doesnt start with http:// or https://, add http
        if (currentAction.after_expiry && !currentAction.after_expiry.startsWith("http://") && !currentAction.after_expiry.startsWith("https://")&&
            // not a vcard
            !(currentAction.after_expiry.startsWith("BEGIN:VCARD") && currentAction.after_expiry.endsWith("END:VCARD"))
        ) {
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


    private getScannedLast(timeInSeconds:number) {
        let now = new Date()
        let timeAgo = new Date(now.getTime() - timeInSeconds*1000)
        let scans = this.scanData.filter((a: { timestamp?: Date }) => a.timestamp > timeAgo)
        return scans.length
        
    }

    private getImportantMoments(from:Date, to: Date): {
        date: Date,
        type: string,
    }[] {

        return this.update_log.filter((a: { date: Date; update: string[]; }) => a.date > from && a.date < to).filter(a => a.update.some(b=>b.startsWith("settings.scanData.information.") || b=="settings.getScanData")).map((a) => {
            let final = 0
            let multiplier = 1
            for (let update of a.update) {
                switch (update) {
                    case "settings.scanData.information.fingerprint":
                        final = 1 * multiplier
                        multiplier *= 2
                        break;
                    case "settings.scanData.information.user-agent":
                        final = 2 * multiplier
                        multiplier *= 2
                        break;
                    case "settings.scanData.information.timestamp":
                        final = 3 * multiplier
                        multiplier *= 2
                        break;
                    case "settings.scanData.information.ip":
                        final = 4 * multiplier
                        multiplier *= 2
                        break;
                    case "settings.scanData.information.location":
                        final = 5 * multiplier
                        multiplier *= 2
                        break;
                    case "settings.getScanData":
                        final = 6 * multiplier
                        multiplier *= 2
                        break;
                    case "id":
                        final = 6 * multiplier
                        multiplier *= 2
                        break;
                    default:
                        break;
                }
        }

            return {
                date: a.date,
                type: final.toString(2)
            }
        })
        
    }

    private getWhereScanned() {
        let rtrn = []
        for (let scan of this.scanData as { location?: { latitude: number; longitude: number; accuracy: number; } }[]) {
            if (scan?.location) {
                rtrn.push([scan.location.latitude, scan.location.longitude])
            }
        }
        return rtrn
    }

    private getScannedDayRank(timezone: string) {
        // get all scans, show how many happened on each day of the week
        const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        let rtrn = [0,0,0,0,0,0,0]
        for (let scan of this.scanData as { timestamp?: Date }[]) {
            if (scan.timestamp) {
                rtrn[days.indexOf(moment(scan.timestamp).tz(timezone).format("dddd"))]++
            }
        }
        return rtrn
    }

    private getScannedEach(timeInSeconds: number) {
        let now = new Date();
        let timeAgo = new Date(now.getTime() - timeInSeconds * 1000);
        let scans = this.scanData.filter((a: { timestamp?: Date }) => a.timestamp > timeAgo);
        let intervalLength = timeInSeconds * 1000; // Length of each interval in milliseconds
        let intervalCounts = [];
        for (let i = 0; i < timeInSeconds; i++) {
            let intervalStart = new Date(timeAgo.getTime() + intervalLength * i);
            let intervalEnd = new Date(timeAgo.getTime() + intervalLength * (i + 1));
            let interval = scans.filter((a: { timestamp?: Date }) =>
                a.timestamp > intervalStart && a.timestamp < intervalEnd
            );
            intervalCounts.push(interval.length);
        }
        let totalScans = intervalCounts.reduce((acc, count) => acc + count, 0); // Total number of scans
        let averageScans = totalScans / intervalCounts.length; // Average number of scans
        return averageScans;
    }

    async getStatistics(type: "ScannedEachX" | "ScannedLastX" | "ScannedWhere" | "Scanned" | "ScannedDayRank", time: "minute" | "hour" | "day" | "week" | "month" | "year", timezone: string): Promise<{
        important_moments: {
            date: Date;
            type: string
        }[],
        info: number | number[] | number[][]
    }> {
        let timeInSeconds = 0
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
                    important_moments: this.getImportantMoments(new Date(new Date().getTime() - timeInSeconds*1000), new Date())
                }
            case "ScannedDayRank":
                return {
                    info: this.getScannedDayRank(timezone),
                    important_moments: this.getImportantMoments(new Date(new Date().getTime() - timeInSeconds*1000), new Date())
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


export type DataT = Pick<QRCode, "data">;
export type SettingsT = Pick<QRCode, "settings">;
export namespace Types {
    export type Data = DataT;
    export type Settings = SettingsT;
    export type RedirectQRCodeData = RedirectQRCodeDataT;
    export type ScheduleQRCodeData = ScheduleQRCodeDataT;
    export type LocationQRCodeData = LocationQRCodeDataT;

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

