import { NextRequest, NextResponse } from "next/server";
import { QRLinkGlobal } from "@/types/api/v1/global";
import { getUser } from "@/utilities/api/v1/authentication";
import QRCodeGenerator from "qrcode";
declare const global: QRLinkGlobal

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Get all QR-codes that are linked to an identifier

  // Check if identifier is valid
  const token = request.headers.get("Authorization");
  if (!token) {
    return new NextResponse(JSON.stringify({
      error: "NO_TOKEN",
      message: "No token provided.",
    }), { status: 400 });
  }

  let identifier: string = null
        // check if identifier is valid (it is already hashed)
    if (!(typeof (token as any) == "string")) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Token needs to be a string.",
        }), { status: 400 });
    }

    let tokenVerificationResult = await getUser(token)
    if (!tokenVerificationResult.isAuthenticated) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token.",
        }), { status: 400 });
    }
    identifier = tokenVerificationResult.user.id
  // get all QR-codes that are linked to the identifier
  const qrcodekeys = Object.keys(global.QRCodeTable).filter((key) => {
    return global.QRCodeTable[key].linked_to == identifier;
  });
  let qrCodes: Array<{}> = [];
  for (let qrcodekey of qrcodekeys) {
    let exportData: Partial<{
        svg: string;
        png: string;
    }> = {}
if (request.nextUrl.searchParams.get("export")) {
  const exportType = (request.nextUrl.searchParams.get("export") as string)?.toLowerCase() ?? "svg,png"
  let exportTypes = exportType.split(",")
    if (exportTypes.filter(a=>!["svg","png"].includes(a)).length != 0) return new NextResponse(JSON.stringify({error: "INVALID_EXPORT_TYPE", message: "Invalid export type."}), {status: 400})
  for (let exportType of exportTypes) {
    switch (exportType) {
      case "svg":
        exportData["svg"] = await QRCodeGenerator.toString(
          process.env.API_URL + "/qrcode/" + qrcodekey + "/handler",
          { type: "svg", errorCorrectionLevel: "H" }
        );
        break;
      case "png":
        exportData["png"] = await QRCodeGenerator.toDataURL(
          process.env.API_URL + "/qrcode/" + qrcodekey + "/handler",
          { errorCorrectionLevel: "H", width: 400}
        );
        break;
      default:
        return new NextResponse(JSON.stringify({
          error: "INVALID_EXPORT_TYPE",
          message: "Invalid export type: " + exportType,
        }), {status: 400});
    }
  }
}
    qrCodes.push({
      id: qrcodekey,
      ...global.QRCodeTable[qrcodekey],
      ...exportData,
    });
  }
  return new NextResponse(JSON.stringify(qrCodes), { status: 200 });
}