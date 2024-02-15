import { MongoClient } from "mongodb";
import { QRCodeTable } from "./QRCode";

interface QRLinkGlobal extends Global {
    mongoConnectionString: string;
    QRCodeTable: QRCodeTable;
    mongoClient: MongoClient;
    storageMethod: "file" | "mongo";
    serverURL: string; // TODO: Remove when moving to Next.js as backend
    port: number; // TODO: Remove when moving to Next.js as backend
    supportedTypes: string[];
    supportedUpdateKeys: string[];
}