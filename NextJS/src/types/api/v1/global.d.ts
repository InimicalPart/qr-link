import { MongoClient } from "mongodb";
import { QRCodeTable } from "./QRCode";

interface QRLinkGlobal extends Global {
    QRBackupFilePath: string;
    mongoConnectionString: string;
    QRCodeTable: QRCodeTable;
    mongoClient: MongoClient;
    storageMethod: "file" | "mongo";
    supportedTypes: string[];
    supportedUpdateKeys: string[];
}