import { MongoClient } from "mongodb";
import { QRCodeTable } from "./QRCode";

interface QRLinkGlobal extends Global {
    QRCodeTable: QRCodeTable;
    mongoClient: MongoClient;
    storageMethod: "file" | "mongo";
    serverURL: string; // TODO: Remove when moving to Next.js as backend
    port: number; // TODO: Remove when moving to Next.js as backend
}