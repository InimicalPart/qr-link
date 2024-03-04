import { QRCode, Types } from "@/utilities/api/v1/qrcode";
import { ObjectId } from "mongodb";

  interface QRCodeTable {
    [key: string]: QRCode;
  }
  
  interface MongoQRCodeInformation extends QRCode {
      id: string;
      _id?: ObjectId
  }