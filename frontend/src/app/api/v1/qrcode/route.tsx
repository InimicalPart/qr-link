import { QRLinkGlobal } from "@/types/api/v1/global";
import { getUser } from "@/utilities/api/v1/authentication";
import { saveQR } from "@/utilities/api/v1/database";
import { checkDataValidity } from "@/utilities/api/v1/update";
import crypto from "crypto";
import QRCodeGenerator from "qrcode";

declare const global: QRLinkGlobal
export async function POST(request: Request): Promise<Response> {
    // return new Response("This is the 'qrcode' module.");
    //   Get user-specified ID, or generate one
  let { id, update_key } = {
    ...{
      id: crypto.randomUUID(),
      update_key: await randomString(32),
    },
    ...(await request.json() as Partial<{ id: string; update_key: string }>),
  };
  const { type, data, expires, name, description, settings } = await request.json();
  const token = request.headers.get("Authorization");

  // Check if type is valid
  if (!type) {
    return new Response(JSON.stringify({
        error: "NO_TYPE",
        message: "No type provided.",
      }),{status:400});
  }
  if (!(typeof (type as any) == "string")) {
    return new Response(JSON.stringify({
      error: "INVALID_TYPE",
      message: "Type needs to be a string.",
    }),{status:400});
  }
  if (!global.supportedTypes.includes(type)) {
    return new Response(JSON.stringify({
      error: "UNSUPPORTED_TYPE",
      message:
        "Type not supported. Supported types: " + global.supportedTypes.join(", "),
    }), {status: 400});
  }
  if (name) {
    if (!(typeof (name as any) == "string")) {
      return new Response(JSON.stringify({
        error: "INVALID_NAME",
        message: "Name needs to be a string.",
      }),{status:400});
    }
    // no longer than 50
    if (name.length > 50) {
      return new Response(JSON.stringify({
        error: "INVALID_NAME",
        message: "Name needs to be less than 50 characters.",
      }),{status:400});
    }
  }
    if (description) {
        if (!(typeof (description as any) == "string")) {
        return new Response(JSON.stringify({
            error: "INVALID_DESCRIPTION",
            message: "Description needs to be a string.",
        }), {status:400});
        }
        // no longer than 200
        if (description.length > 200) {
            return new Response(JSON.stringify({
                error: "INVALID_DESCRIPTION",
                message: "Description needs to be less than 200 characters.",
            }), {status:400});
        }
    }

  // Check if data is valid
  if (!data) {
    return new Response(JSON.stringify({
      error: "NO_DATA",
      message: "No data provided.",
    }), {status:400});
  }
  const dataValidity = await checkDataValidity(type, data, id);
  if (!dataValidity.valid) {
    return new Response(JSON.stringify({
      error: dataValidity.error,
      message: dataValidity.message,
    }), {status:400});
  }

  if (data.redirect_to) {
    data.redirect_to = data.redirect_to.trim();
  }

  // Check if ID is valid
  if (!(typeof (id as any) == "string")) {
    return new Response(JSON.stringify({
      error: "INVALID_ID",
      message: "ID needs to be a string.",
    }), {status:400});
  }

  // Check if update key is valid
  if (!(typeof (update_key as any) == "string")) {
    return new Response(JSON.stringify({
      error: "INVALID_UPDATE_KEY",
      message: "update_key needs to be a string.",
    }), {status:400});
  }
  let identifier = undefined
  if (token) {
    // check if identifier is valid (it is already hashed)
    if (!(typeof (token as any) == "string")) {
      return new Response(JSON.stringify({
        error: "INVALID_TOKEN",
        message: "Token needs to be a string.",
        }), {status:400});
    }
    let tokenVerificationResult = await getUser(token)
    if (!tokenVerificationResult.isAuthenticated) {
        return new Response(JSON.stringify({
            error: "INVALID_TOKEN",
            message: "Invalid token.",
        }), {status:400});
    }

    identifier = tokenVerificationResult.user.id
  }
  if (expires) {
    // needs to be a date or null
    if (
      ((new Date(expires) as any) == "Invalid Date" ||
        !(typeof (expires as any) == "string")) &&
      expires != null
    ) {
      return new Response(JSON.stringify({
        error: "INVALID_EXPIRES",
        message: "expires needs to be a date or null.",
      }), {status:400});
    }
  }

  if (settings) {
    // has to be an object
    if (!(typeof (settings as any) == "object")) {
      return new Response(JSON.stringify({
        error: "INVALID_SETTINGS",
        message: "settings needs to be an object.",
      }), {status:400});
    }
  }

  if (!/^[a-zA-Z0-9_.-]*$/.test(id)) return new Response(JSON.stringify({error: "INVALID_ID", message: "'id' can only contain alphanumeric characters, underscores and dashes and periods."}), {status:400});

  // Check if ID is already in use, as well as if it's user-specified, if both are true, return an error, otherwise, if it's only in use, generate a new ID until it is not in use
  while (global.QRCodeTable[id]) {
    if ((await request.json()).id) {
      return new Response(JSON.stringify({
        error: "ID_IN_USE",
        message: "ID already in use.",
      }), {status:400});
    }
    id = crypto.randomUUID();
  }

  global.QRCodeTable[id] = {
    type,
    data,
    update_key,
    created: new Date(),
    updated: new Date(),
    name: name ? name : null,
    description: description ? description : null,
    linked_to: identifier ? identifier : null,
    expires: expires ? new Date(expires) : null,
    scanCount: 0,
    scanData: [],
    settings: {
        getScanData: settings?.getScanData ?? true,
        scanData: {
            fingerprint: settings?.scanData?.fingerprint ?? false,
            "user-agent": settings?.scanData?.["user-agent"] ?? false,
            timestamp: settings?.scanData?.timestamp ?? true,
            ip: settings?.scanData?.ip ?? false,
            location: settings?.scanData?.location ?? false,
        },
        requirements: {
            location: settings?.requirements?.location ?? false, //! Warning, this currently does not work on iOS, as it does not like to share location data with http:// websites, will be fixed when we move to https://
        }
    }
  };

saveQR(id, global.QRCodeTable[id])

const qrcode = await QRCodeGenerator.toString(
    global.serverURL + ":" + global.port  + "/qrcode/" + id + "/handler",
    { type: "svg", errorCorrectionLevel: "H" }
);

  return new Response(JSON.stringify({
    id,
    update_key,
    type,
    data,
    svg: (qrcode as string).trim(),
  }), {status:201});

}

export async function randomString(length: number) {
    return new Promise<string>((resolve, reject) => {
      crypto.randomBytes(length, function (err, buffer) {
        if (err) {
          reject(err);
        }
        resolve(buffer.toString("hex"));
      });
    });
  }