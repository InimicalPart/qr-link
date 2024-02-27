import { QRCode, Types } from "@/utilities/api/v1/qrcode";
import { ObjectId } from "mongodb";

export interface QRCodeData extends Types.Data {
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
            sendToURL: boolean;
            JWTEncryptionKey: string;
        },
        requirements: {
            location: boolean; //! Only works if settings.scanData.location and settings.getScanData are both true
        }

    }
  }

  interface QRCodeTable {
    [key: string]: QRCode;
  }
  
  interface MongoQRCodeInformation extends QRCode {
      id: string;
      _id?: ObjectId
  }