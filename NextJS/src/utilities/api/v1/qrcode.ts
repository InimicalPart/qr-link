import moment from "moment-timezone";
import { getPassedTime } from "./misc";
import { SignJWT } from "jose";
import UAParser from "ua-parser-js";

export class QRCode {

    id: Readonly<string>;
    type: string;
    data: RedirectQRCodeDataT|ScheduleQRCodeDataT|LocationQRCodeDataT|UserAgentQRCodeDataT;
    linked_to: string | null = null;
    created: string = new Date().toISOString();
    updated: string = new Date().toISOString();
    expires: string | null;
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
                ip: false,
                location: false
            },
            sendToURL: false,
            JWTEncryptionKey: ""
        },
        getScanData: true
    };
    scanCount: number = 0;
    scanData: (ScanDataT | object)[] = [];
    update_log: {
        date: string;
        update: {
            [key:string]: any
        };
    }[] = [];


    /**
     * Add an update to the update log
     * @param update The update to add, only the fields that are updated should be included
     * @param time The time of the update, defaults to the current time
     */
    addToUpdateLog(update: Partial<QRCode>, time: string = new Date().toISOString()) {
        this.update_log.push({
            date: time,
            update: Object.assign({},update as object)
        })

        this.update_log = this.update_log.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    private deepAssign(target: any, source: any) {
        for (const key in source) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            if (!target[key]) {
            target[key] = {};
            }
            this.deepAssign(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
        }
    }

    update(update: Partial<QRCode>) {
        const updateTime = new Date().toISOString()
        this.addToUpdateLog(update,updateTime)
        this.updated = updateTime

        if (update.data) {
            this.data = null
        }

        this.deepAssign(this, update);
    }

    /**
     * Create a new QR code
     * @param newInformation The information to create the QR code with, if any 
     */
    constructor(newInformation?: Partial<QRCode> | undefined) {
        if (newInformation) this.deepAssign(this, newInformation)
        if (!this.update_log.find(a=>a.update.created)) {
            this.addToUpdateLog({
                created: this.created
            }, this.created)
        }
    }

    /**
     * Signs the scan data with the JWT encryption key provided by the user in the settings
     * @param scanData The scan data to sign
     * @returns The signed JWT or null if the QR code does not have a JWT encryption key
     */
    async signScanData(scanData: ScanDataT) {
        return this.hasSendToURL() ? await new SignJWT({
            scanData
          })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setIssuedAt()
            .setExpirationTime('1m') //! 1 minute, should be enough for the other end to verify the JWT
            .sign(new Uint8Array(Buffer.from(this.getEncryptionKey(), 'base64'))) : null
    }

    /**
     * Checks if the QR code needs to have location data for the user to get redirected
     * @returns True if the QR code requires location data, false otherwise
     */
    hasLocationRequirement() {
        return this.settings.requirements.location && this.settings.getScanData && this.settings.scanData.information.location 
    }

    /**
     * Checks if the QR code needs to have user agent data for the user to get redirected
     * @returns True if the QR code requires user agent data, false otherwise
     */
    hasUserAgentRequirement() {
        return this.settings.getScanData && this.settings.scanData.information["user-agent"] && this.settings.requirements["user-agent"]
    }

    /**
     * Checks if the QR code has a JWT encryption key and a send to URL property set
     * @returns True if the QR code has a JWT encryption key and a send to URL property set, false otherwise
     */
    hasSendToURL() {
        return this.settings.scanData.sendToURL && this.settings.scanData.JWTEncryptionKey
    }
    
    /**
     * Get the QR code's JWT encryption key
     * @returns True if the QR code has a JWT encryption key and a send to URL property set, false otherwise
     */
    getEncryptionKey() {
        return this.hasSendToURL() ? this.isBase64(this.settings.scanData.JWTEncryptionKey) ? this.settings.scanData.JWTEncryptionKey : Buffer.from(this.settings.scanData.JWTEncryptionKey).toString("base64") : null
    }

    /**
     * Checks if the string is base64
     * @param str The string to check
     * @returns True if the string is base64, false otherwise
     */
    private isBase64(str: string) {
        return Buffer.from(str, 'base64').toString('base64') === str;
    }
    
    /**
     * Get the QR code's scan data settings
     * @returns The scan data settings
     */
    getScanDataSettings() {
        return {...this.settings.scanData.information,location_required: this.hasLocationRequirement(), user_agent_required: this.hasUserAgentRequirement()}
    }
    
    /**
     * Checks if the QR code wants scan data
     * @returns True if the QR code wants scan data, false otherwise
     */
    wantsScanData() {
        return this.settings.getScanData
    }


    /**
     * Checks if the QR code has expired
     * @returns True if the QR code has expired, false otherwise
     */
    isExpired() {
        return this.expires ? new Date() > new Date(this.expires) : false
    }

    /**
     * Checks if the QR code has after expiry property in its data object
     * @returns True if the QR code has after expiry property in its data object, false otherwise
     */
    hasAfterExpiry() {
        return JSON.stringify(this.data).includes("after_expiry")
    }

    /**
     * Get the redirect URL for the QR code
     * @param scanData The scan data to use for the redirect
     * @returns The redirect URL or after expiry URL if the QR code has expired, if it has one, otherwise null
     */
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

            let day = moment.tz(data.timezone ?? moment.tz.guess()).format("dddd").toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
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
                        console.log("[-QR-] No valid schedule found for QR-code " + this.id + "!!")
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
                console.log("[-QR-] Zone " + currentZone.type+"-"+currentZone.priority+"-"+currentZone?.positions?.length + " found for QR-code " + this.id + "!!")
                console.log("[-QR-] User is at " + locationData.latitude + "," + locationData.longitude)
                if (currentZone.isEntireWorld) {
                    console.log("[-QR-] Zone is the entire world.")
                } else if (currentZone.type == "circle") {
                    console.log("[-QR-] Zone is a circle with a radius of " + currentZone.radius + " meters and a center at " + currentZone.center[0] + "," + currentZone.center[1])
                    console.log("[-QR-] User is " + getDistanceFromLatLonInMeters(locationData.latitude, locationData.longitude, currentZone.center[0], currentZone.center[1]) + " meters away from the center.")
                } else if (currentZone.type == "polygon") {
                    console.log("[-QR-] Zone is a polygon with " + currentZone.positions.length + " points.")
                    console.log("[-QR-] User is " + (this.isPointInPolygon(locationData, currentZone.positions) ? "" : "not ") + "inside the polygon.")
                }
            }


            currentAction.redirect_to = currentZone.redirect_to
            currentAction.after_expiry = currentZone.after_expiry
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

    /**
     * Get all browsers that have scanned the QR code
     * @returns An object with the browsers and the amount of times they have scanned the QR code 
    */
    private getBrowsers() {
        return this.scanData.filter((a: ScanDataT) => a["user-agent"]).map((a: ScanDataT) => new UAParser(a["user-agent"]).getBrowser().name).map(a=>a==undefined?"Other":a).reduce((a: { [key: string]: number }, b: string) => {
            a[b] = (a[b] || 0) + 1
            return a
        }, {}) // Add an empty object as the initial value for the accumulator
    }

    /**
     * Get all operating systems that have scanned the QR code
     * @returns An object with the operating systems and the amount of times they have scanned the QR code
    */
    private getOSs() {
        return this.scanData.filter((a: ScanDataT) => a["user-agent"]).map((a: ScanDataT) => new UAParser(a["user-agent"]).getOS().name).map(a=>a==undefined?"Other":a).reduce((a: { [key: string]: number }, b: string) => {
            a[b] = (a[b] || 0) + 1
            return a
        }, {}) // Add an empty object as the initial value for the accumulator
    }


    /**
     * Get the amount of scans that have happened in the last timeInSeconds seconds
     * @param timeInSeconds The amount of seconds to look back
     * @param since The date to look back to
     * @returns The amount of scans that have happened in the last timeInSeconds seconds
    */
    private getScannedLast(timeInSeconds: number, since = new Date()) {
        let timeAgo = new Date(since.getTime() - timeInSeconds * 1000)
        let scans = this.scanData.filter((a: ScanDataT) => a.timestamp).filter((a: ScanDataT) => new Date(a.timestamp) > timeAgo && new Date(a.timestamp) < since)
        return scans
    }

    /**
     * Gets important updates that have happened in the last timeInSeconds seconds
     * @param from The date to look back to
     * @param to The date to look forward to
     * @returns An array of important updates that have happened in the last timeInSeconds seconds
    */
    getImportantMoments(from:string, to: string): {
        date: string,
        update: {[key:string]:any},
    }[] {

        return this.update_log
            .filter((a: { date: string; update: {[key:string]:any}}) => (new Date(a.date) >= new Date(from) && new Date(a.date) <= new Date(to)))
            .filter((a: { date: string; update: {[key:string]:any}}) => Object.keys(a.update).some(b => b.startsWith("settings.scanData") || b == "created")).map((a: { date: string; update: {[key:string]:any}}) => {
                return {
                    date: a.date,
                    update: a.update
                }
            })
        
    }

    /**
     * Get the locations of where the QR code has been scanned
     * @returns An array of the locations of where the QR code has been scanned
     */
    private getWhereScanned() {
        let rtrn = []
        for (let scan of this.scanData as ScanDataT[]) {
            if (scan?.location) {
                const uaInfo = new UAParser(scan["user-agent"])
                rtrn.push({
                    timestamp: scan.timestamp,
                    latitude: scan.location.latitude,
                    longitude: scan.location.longitude,
                    accuracy: scan.location.accuracy,
                    ...(
                        scan["user-agent"] ? {
                            browser: uaInfo.getBrowser().name ?? "Unknown",
                            browser_version: uaInfo.getBrowser().version ?? "Unknown",
                            os: uaInfo.getOS().name ?? "Unknown",
                            os_version: uaInfo.getOS().version ?? "Unknown"
                        } : {}
                    )
                })
            }
        }
        return rtrn
    }

    /**
     * Get the amount of scans that have happened on each day of the week
     * @param timezone The timezone to use
     * @returns An object with the amount of scans that have happened on each day of the week
     */
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
        for (let scan of this.scanData as ScanDataT[]) {
            if (scan.timestamp) {
                rtrn[moment(scan.timestamp).tz(timezone).format("dddd").toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"]++
            }
        }
        return rtrn
    }

    /**
     * Get the amount of scans that have happened at each hour of the day
     * @returns An object with the amount of scans that have happened at each hour of the day
     */
    private getScannedTimeRank() {
        // get all scans, show how many happened at each hour of the day
        let rtrn: { [key: string]: number } = {};
        for (let i = 0; i < 24; i++) {
            let label = i.toString().padStart(2, '0') + ":00"
            rtrn[label] = 0;
        }
        for (let scan of this.scanData as ScanDataT[]) {
            if (scan.timestamp) {
                let hour = new Date(scan.timestamp).getUTCHours();
                let label = hour.toString().padStart(2, '0') + ":00"
                rtrn[label]++;
            }
        }
        return rtrn;
    }

    /**
     * Get the amount of scans that have happened at each hour of the day
     * @param timezone The timezone to use
     * @returns An object with the amount of scans that have happened at each hour of the day
     */
    private getScannedTimeRank12() {
        let rtrn: { [key: string]: number | null } = {};
        for (let i = 0; i < 12; i++) {
            let amLabel = i === 0 ? "12:00 AM" : i.toString().padStart(2, '0') + ":00 AM";
            let pmLabel = i === 0 ? "12:00 PM" : i.toString().padStart(2, '0') + ":00 PM";
            rtrn[amLabel] = 0;
            rtrn[pmLabel] = 0;
        }
    
        for (let scan of this.scanData as ScanDataT[]) {
            if (scan.timestamp) {
                let hour = new Date(scan.timestamp).getUTCHours();
                let label = hour >= 12 ? ((hour === 12 ? "12:00 PM" : (hour - 12).toString().padStart(2, '0') + ":00 PM")) : (hour === 0 ? "12:00 AM" : hour.toString().padStart(2, '0') + ":00 AM");
                rtrn[label]++;
            }
        }
        return rtrn;
    }
    

    /**
     * Get the amount of scans that have happened in a timeInSeconds period
     * @param timeInSeconds The amount of seconds to look back
     * @returns The amount of scans that have happened in a timeInSeconds period
     */
    private getScannedEach(timeInSeconds: number) {
        // for every timeInSeconds back, get the amount of scans, then average it out
        let time = new Date()
        let totalScans = 0;
        let count = 0;
        while (time.getTime() > new Date(this.created).getTime()) {
            totalScans += this.getScannedLast(timeInSeconds,time).length;
            count++;
            time = new Date(time.getTime() - timeInSeconds*1000);
        }
        const averageScans = totalScans / count;
        return Math.floor(averageScans);
    }

    /**
     * Get the QRcode's statistics
     * @param settings The settings to use
     * @param settings.type The type of statistics to get
     * @param settings.time The time to get the statistics for
     * @param settings.multiplier The multiplier to use for the time
     * @param settings.timezone The timezone to use
     * @param settings.onlyFields The fields to get the statistics for
     * @returns The QRcode's statistics
     */
    async getStatistics({
        type,
        time,
        multiplier = 1,
        timezone,
        last,
        onlyFields: wantedFields
    }:{
        type: string,
        time: string,
        multiplier?: number,
        timezone: string,
        last?: number,
        onlyFields?: string | string[]
    
    }): Promise<{
        important_moments: {
            date: string;
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
        } | {}[]
    } | {
        error: string,
        message: string
    }> {

        if (wantedFields && !Array.isArray(wantedFields) && typeof wantedFields === "string") {
            wantedFields = [wantedFields]
        }
        if (wantedFields) wantedFields = (wantedFields as string[]).filter((a, b) => wantedFields.indexOf(a) === b)
        if (this.scanData.length == 0) return {info:[],important_moments:[]}
        let timeInSeconds = 0
        if (time) {
            switch (time) {
                case "minute":
                    timeInSeconds = (60) * multiplier
                    break;
                case "hour":
                    timeInSeconds = (60*60) * multiplier
                    break;
                case "day":
                    timeInSeconds = (60*60*24) * multiplier
                    break;
                case "week":
                    timeInSeconds = (60*60*24*7) * multiplier
                    break;
                case "month":
                    timeInSeconds = (60*60*24*30) * multiplier
                    break;
                case "year":
                    timeInSeconds = (60*60*24*365) * multiplier
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

        /**
         * Get only the wanted fields from the info
         * @param info The info to get the wanted fields from
         * @returns The info with only the wanted fields
         */
        const GetOnlyWantedFields = (info:any)=>wantedFields ? (wantedFields as any).map((wantedField: any)=>{ return {[wantedField]:info[wantedField]} }).reduce((addition: any,total: any)=>total={...total, ...addition},{}) : info

        /**
         * Clear undefined fields from the info
         * @param info The info to clear the undefined fields from
         * @returns The info with the undefined fields cleared
         */
        const clearUndefined = (info: any) => JSON.parse(JSON.stringify(info))

        switch (type) {
            case "ScannedLastX":
                return {
                    info: this.getScannedLast(timeInSeconds).map(GetOnlyWantedFields).map(clearUndefined),
                    important_moments: this.getImportantMoments(new Date(new Date().getTime() - timeInSeconds*1000).toISOString(), new Date().toISOString())
                }
            case "ScannedEachX":
                return {
                    info: this.getScannedEach(timeInSeconds),
                    important_moments: this.getImportantMoments(new Date(new Date().getTime() - timeInSeconds*1000).toISOString(), new Date().toISOString())
                }
            case "ScannedWhere":
                let scanned = this.getWhereScanned()
                return {
                    info: last ? scanned.slice(0, last) : scanned,
                    important_moments: this.getImportantMoments(new Date(new Date().getTime() - timeInSeconds*1000).toISOString(), new Date().toISOString()),
                    ...(
                        this.type == "location" ? {
                            zones: (this.data as unknown as LocationQRCodeDataT).zones.map((a) => {
                                return {
                                    type: a.type,
                                    ...(
                                        a.type == "circle" ? {
                                            center: a.center,
                                            radius: a.radius
                                        } : {}
                                    ),
                                    ...(
                                        a.type == "polygon" ? {
                                            positions: a.positions
                                        } : {}
                                    )

                                }
                            })
                        } : {}
                    )
                }
            case "ScannedCount":
                return {
                    info: this.scanCount,
                    important_moments: this.getImportantMoments(this.created, new Date().toISOString())
                }
            case "Scanned":
                return {
                    info: this.scanData.map(GetOnlyWantedFields).map(clearUndefined),
                    important_moments: this.getImportantMoments(this.created, new Date().toISOString())
                }

            case "ScannedDayRank":
                return {
                    info: this.getScannedDayRank(timezone),
                    important_moments: this.getImportantMoments(this.created, new Date().toISOString())
                }
            case "ScannedTimeRank":
                return {
                    info: this.getScannedTimeRank(),
                    important_moments: this.getImportantMoments(this.created, new Date().toISOString())
                }
            case "ScannedTimeRank12H":
                return {
                    info: this.getScannedTimeRank12(),
                    important_moments: this.getImportantMoments(this.created, new Date().toISOString())
                }    
            case "OS":
                return {
                    info: this.getOSs(),
                    important_moments: this.getImportantMoments(this.created, new Date().toISOString())
                }
            case "Browser":
                return {
                    info: this.getBrowsers(),
                    important_moments: this.getImportantMoments(this.created, new Date().toISOString())
                }
            default:
                return null

        }

    }



    /**
     * Checks if a point is inside a polygon
     * @param locationData The location data to check
     * @param positions The positions of the polygon
     * @returns True if the point is inside the polygon, false otherwise
     */
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
        redirect_to: string;
        after_expiry: string;
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
export interface ScanDataT {
    fingerprint?: string;
    "user-agent"?: string;
    timestamp?: string;
    ip?: string;
    location?: {
        latitude: number;
        longitude: number;
        accuracy: number;
    };
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
    export type ScanData = ScanDataT;

}


/**
 * Get the distance between two points
 * @param p1Lat The latitude of the first point
 * @param p1Lon The longitude of the first point
 * @param p2Lat The latitude of the second point
 * @param p2Lon The longitude of the second point
 * @returns The distance between the two points
 */
function getDistanceFromLatLonInMeters(p1Lat: number, p1Lon: number, p2Lat: number, p2Lon: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(p2Lat - p1Lat);  // deg2rad below
    var dLon = deg2rad(p2Lon - p1Lon);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(p1Lat)) * Math.cos(deg2rad(p2Lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c * 1000; // Distance in m
    return d;
}

/**
 * Convert degrees to radians
 * @param degrees The degrees to convert
 * @returns The degrees in radians
 */
function deg2rad(degrees: number) {
    return degrees * (Math.PI / 180)
}

