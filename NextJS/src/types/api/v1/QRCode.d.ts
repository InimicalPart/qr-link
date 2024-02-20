import { ObjectId } from "mongodb";

export interface QRCodeData {
    // redirect_to: string; 
    // after_expiry: string;
    // schedule: {
    //   "monday": {[key:string]:{redirect_to: string, after_expiry: string}}
    //   "tuesday": {[key:string]:{redirect_to: string, after_expiry: string}}
    //   "wednesday": {[key:string]:{redirect_to: string, after_expiry: string}}
    //   "thursday": {[key:string]:{redirect_to: string, after_expiry: string}}
    //   "friday": {[key:string]:{redirect_to: string, after_expiry: string}}
    //   "saturday": {[key:string]:{redirect_to: string, after_expiry: string}}
    //   "sunday": {[key:string]:{redirect_to: string, after_expiry: string}}
    //   "timezone": string;
    // },
    // location: {
    //     type: 'circle' | 'polygon';
    //     priority: number;
    //     isEntireWorld: boolean;
    //     positions?: number[][];
    //     center?: number[];
    //     radius?: number;
    //     redirectTo: string;
    //     afterExpiry: string;
    // }[]
}

export interface RedirectQRCodeData extends QRCodeData {
    redirect_to: string;
    after_expiry: string;
}
export interface ScheduleQRCodeData extends QRCodeData {
    "monday": {[key:string]:RedirectQRCodeData}
    "tuesday": {[key:string]:RedirectQRCodeData}
    "wednesday": {[key:string]:RedirectQRCodeData}
    "thursday": {[key:string]:RedirectQRCodeData}
    "friday": {[key:string]:RedirectQRCodeData}
    "saturday": {[key:string]:RedirectQRCodeData}
    "sunday": {[key:string]:RedirectQRCodeData}
    "timezone": string;
}

export interface LocationQRCodeData extends QRCodeData {
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

export interface QRCodeInformation {
    type: string;
    data: Partial<RedirectQRCodeData|ScheduleQRCodeData|LocationQRCodeData>;
    update_key: string;
    created: Date;
    updated: Date;
    linked_to: string | null;
    name: string | null;
    description: string | null;
    expires: Date | null;
    scanCount: number;
    scanData: Array<Partial<{
        fingerprint: string;
        "user-agent": string;
        timestamp: Date;
        ip: string;
        location: {
            latitude: number;
            longitude: number;
            accuracy: number;
        }
    }>>
    settings: {
        getScanData: boolean;
        scanData: {
            information: {
                fingerprint: boolean;
                "user-agent": boolean;
                timestamp: boolean;
                ip: boolean;
                location: boolean;
            },
            sendScanDataToURL: boolean;
            JWTEncryptionKey: string;
        },
        requirements: {
            location: boolean; //! Only works if settings.scanData.location and settings.getScanData are both true
        }

    }
  }

  interface QRCodeTable {
    [key: string]: QRCodeInformation | MongoQRCodeInformation;
  }
  
  interface MongoQRCodeInformation extends QRCodeInformation {
      id: string;
      _id?: ObjectId
  }