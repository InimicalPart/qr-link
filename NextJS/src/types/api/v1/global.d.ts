import { MongoClient } from "mongodb";
import { QRCodeTable } from "./QRCode";
import { APIKeys } from "./APIKeys";

interface QRLinkGlobal extends Global {
    APIKeyTable: APIKeys;
    APIBackupFilePath: any;
    debugMode: boolean;
    QRBackupFilePath: string;
    mongoConnectionString: string;
    QRCodeTable: QRCodeTable;
    mongoClient: MongoClient;
    storageMethod: "file" | "mongo";
    supportedTypes: string[];
    supportedUpdateKeys: string[];
}