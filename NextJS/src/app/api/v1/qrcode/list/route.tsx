import { NextRequest, NextResponse } from "next/server";
import { QRLinkGlobal } from "@/types/api/v1/global";
import { getUser } from "@/utilities/api/v1/authentication";
import QRCodeGenerator from "qrcode";
import moment from "moment-timezone";
declare const global: QRLinkGlobal

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Get all QR-codes that are linked to an identifier

  // Check if identifier is valid
  const token = request.headers.get("Authorization");
  if (!token) {
    return new NextResponse(JSON.stringify({
      error: "NO_TOKEN",
      message: "No token provided.",
    }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  let userID: string = null
        // check if identifier is valid (it is already hashed)
    if (!(typeof (token as any) == "string")) {
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Token needs to be a string.",
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    let tokenVerificationResult = await getUser(token, {
        required_permission: "qrcode:read",
    })
    if (!tokenVerificationResult.isAuthenticated) {
        if (tokenVerificationResult.reason) {
            switch (tokenVerificationResult.reason) {
                case "invalid_perms":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_PERMISSIONS",
                        message: "The token provided does not have the required permissions to access this resource.",
                    }), {status:403, headers: { "Content-Type": "application/json" } });
                case "invalid_owner":
                    return new NextResponse(JSON.stringify({
                        error: "INVALID_OWNER",
                        message: "The owner of this API token does not exist.",
                    }), {status:400, headers: { "Content-Type": "application/json" } });
            }
        }
        return new NextResponse(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token.",
        }), {status:400, headers: { "Content-Type": "application/json" } });
    }
    userID = tokenVerificationResult.user.id


  //! Get all QR-codes that are linked to the user
  const ownedQRCodes = Object.keys(global.QRCodeTable).filter((key) => {
    return global.QRCodeTable[key].linked_to == userID;
  });
  let qrCodes: Array<{}> = [];
  for (let ownedQRCodeID of ownedQRCodes) {
    let exportData: Partial<{
        svg: string;
        png: string;
    }> = {}
    let statistics: any = {
        info: []
    }
if (request.nextUrl.searchParams.get("export")) {
  const exportType = (request.nextUrl.searchParams.get("export") as string)?.toLowerCase() ?? "svg,png"
  let exportTypes = exportType.split(",")
    if (exportTypes.filter(a=>!["svg","png"].includes(a)).length != 0) return new NextResponse(JSON.stringify({error: "INVALID_EXPORT_TYPE", message: "Invalid export type."}), {status: 400, headers: { "Content-Type": "application/json" } });
  for (let exportType of exportTypes) {
    switch (exportType) {
      case "svg":
        exportData["svg"] = await QRCodeGenerator.toString(
          process.env.API_URL + "/qrcode/" + ownedQRCodeID + "/handler",
          { type: "svg", errorCorrectionLevel: "H" }
        );
        break;
      case "png":
        exportData["png"] = await QRCodeGenerator.toDataURL(
          process.env.API_URL + "/qrcode/" + ownedQRCodeID + "/handler",
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
if (request.nextUrl.searchParams.get("statistics")) {
    const value = request.nextUrl.searchParams.get("statistics") as string
    const statisticsTypeAbbr = value[0]
    const statisticsTimeMultiplier = parseInt(value.match(/[0-9]{1,3}/)[0])
    const statisticsPeriodUnitAbbr = value[value.length - 1]
    const timezone = request.nextUrl.searchParams.get("timezone") ?? moment.tz.guess()
    const wantedFields = request.nextUrl.searchParams.get("fields")?.split(",") // optional

    let statisticsType: "ScannedLastX" | string = null
    let statisticsPeriodUnit: "day" | "week" | "month" | "year" = null

    switch (statisticsTypeAbbr) {
        case "L":
            statisticsType = "ScannedLastX"
            break
        default:
            return new NextResponse(JSON.stringify({
                error: "INVALID_STATISTICS_TYPE",
                message: "Invalid statistics type: " + statisticsTypeAbbr,
            }), {status: 400, headers: { "Content-Type": "application/json" } });
    }

    switch (statisticsPeriodUnitAbbr) {
        case "D":
            statisticsPeriodUnit = "day"
            break
        case "W":
            statisticsPeriodUnit = "week"
            break
        case "M":
            statisticsPeriodUnit = "month"
            break
        case "Y":
            statisticsPeriodUnit = "year"
            break
        default:
            return new NextResponse(JSON.stringify({
                error: "INVALID_STATISTICS_PERIOD_UNIT",
                message: "Invalid statistics period unit: " + statisticsPeriodUnitAbbr,
            }), {status: 400, headers: { "Content-Type": "application/json" } });
    }

    statistics = await global.QRCodeTable[ownedQRCodeID].getStatistics({
        type: statisticsType,
        time: statisticsPeriodUnit,
        multiplier: statisticsTimeMultiplier,
        timezone,
        onlyFields: wantedFields.length > 0 ? wantedFields : null
    })
}



    qrCodes.push({
      id: ownedQRCodeID,
      ...Object.assign({},global.QRCodeTable[ownedQRCodeID]),
      ...exportData,
      statistics: statistics.info
    });
  }
  return new NextResponse(JSON.stringify(qrCodes), { status: 200, headers: { "Content-Type": "application/json" } });
}