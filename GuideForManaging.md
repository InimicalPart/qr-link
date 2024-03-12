# Guide for understanding, managing, and troubleshooting QRLink on your own.
This guide was written to help you understand, manage, and successfully troubleshoot QRLink when I, the creator, am no longer able to.

## What is QRLink?
First of all, let's get into what QRLink is. QRLink is a demo project to showcase the endless possiblities of dynamic QR-codes, and what we could do with them with enough development.

In more detail, QRLink spits out a QR-code that points to a backend API handler (in this case https://qrlink.newseed.se/api/v1/qrcode/[ID]/handler), which processes the request and makes various checks with the information that the owner has set for the QR-code with that ID.

## Documentation
You can find the full OpenAPI specification for QRLink [here](https://github.com/newseedit/dynamic-qr-link/blob/main/openapi.yml).

## QRLink-code's structure
Below is an example of what a QRLink-code's object looks like:
```jsonc
{
  "linked_to": "user_01HQSXYJD34D76YV1X9Q6SGPE7", // The QRLink-code's owner as an Authkit user ID
  "created": "2024-03-11T14:51:27.450Z", // The date and time that the QRLink-code was created
  "updated": "2024-03-11T14:51:27.450Z", // The date and time that the QRLink-code was last updated.
  "description": "This is a very well working QRLink-code", // The description of the QRLink-code (shows up in the dashboard)
  "name": "QRLink-code for testing", // The name of the QRLink-code (shows up in the dashboard) 
  "settings": {
    "getScanData": true, // Whether or not the QRLink-code will grab information from a scan
    "scanData": {
      "information": {
        "fingerprint": true, // Get the user's device fingerprint
        "user-agent": true, // Get the user's device and browser information
        "ip": true, // Get the IP that the user is connecting from
        "location": true // Get the user's location
      },
      "sendToURL": false, // If the scan data should be sent to the redirect URL (only works for links, not VCards)
      "JWTEncryptionKey": "" // The secret key used to sign the JWT token sent to the redirect URL, this has to be set to something other than "" or null if "sendToURL" is set to true
    },
    "requirements": {
      "location": false, // Whether or not the user needs to provide their location to continue
      "user-agent": false // Whether or not the user needs to provide their device and browser information to continue
    }
  },
  "scanCount": 1, // The amount of time that the QR-code was scanned
  "scanData": [
    {
      "fingerprint": 123456789,
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "location": { // The user's coordinates
         "latitude": -10.514473,
         "longitude": 105.622559,
         "accuracy": 19.093 // in meters
      },
      "timestamp": "2024-03-11T14:56:49.441Z", // Timestamp of when the code was scanned (automatically collected)
      "ip": "1.2.3.4" // The user's IP address
    }
  ],
  "update_log": [ // Shows what updates have been made and at which time
    {
      "date": "2024-03-11T14:51:27.450Z",
      "update": {
         "created": "2024-03-11T14:51:27.450Z"
      }
    },
    {
      "date": "2024-03-11T15:51:27.450Z",
      "update": {
         "settings.scanData.getScanData": true,
         "settings.scanData.information.fingerprint": true,
         "settings.scanData.information.user-agent": true,
         "settings.scanData.information.ip": true,
         "settings.scanData.information.location": true,
      }
    }
  ],
  "type": "user-agent", // The redirection type of the QRLink-code
  "data": { // Specific instructions for the redirection type
    "userAgents": [
      {
        "browser": "/(?:Chrome|CriOS)\\/([0-9]+\\.[0-9]+)/", // Regular expression pattern for the "Chrome" browser
        "browser_name": "chrome", // The name of the browser pattern (shows when creating/managing a code in the dashboard)
        "os": "/(?:Windows|Win[0-9]+)/", // Regular expression pattern for the "Windows" OS
        "os_name": "windows", // The name of the OS pattern (shows when creating/managing a code in the dashboard)
        "redirect_to": "chromewin.extension.com", // The site/VCard to redirect the user to if the above conditions match
        "after_expiry": "expired.chromewin.extension.com" // The site/VCard to redirect the user to if the above conditions match but the QRLink-code is expired. This property is optional.  
      },
      {
        "browser": "/(?:Chrome|CriOS)\\/([0-9]+\\.[0-9]+)/",
        "browser_name": "chrome",
        "os": "/(?:Linux|X11)/",
        "os_name": "linux",
        "redirect_to": "chromelinux.extension.com"
      },
         ...
      { // Fallback condition, if none of the above match
        "browser": "/.*/",
        "browser_name": "any",
        "os": "/.*/",
        "os_name": "any",
        "redirect_to": "anyother.extension.com"
      }
    ]
  },
  "update_key": "80970bdf5309ffec408383bd48d8f6d76e6181f1898ae0b6956d9f90325b5aeb", // The secret key that is used to update the QR-code, this property is optional. If this property is not provided, QRLink will automatically generate one for you.
  "expires": null, // The date and time at which the QRLink-code expires (in the YYYY-MM-DDTHH:mm:ss.sssZ format (ISO 8601 format)), this property is optional. If this property is not provided, the QRLink-code will never expire.
  "id": "08cc49d5-5ab2-45d2-a26f-a4abf53ca7c9" // The ID of the QRLink-code. This property is optional. If this property is not provided, QRLink will automatically generate one for you.
}
```

## QRLink-code Types

The QRLink-code can have various properties set that defines what to do with the incoming request. This is a list of them all, as of March 11th 2024:

- Redirect
   - The 'redirect' type works like a permanent redirect link. There are no special conditions, and it will just redirect the user to the specified link unless the link gets changed by the owner or through the API.
- Schedule
   - A QRLink-code with the type 'schedule' will change where it's pointing to based on a time and weekday. For example, at Monday 12:00 AM until the next provided time, it will send the user to google.com, but once it turns into Friday 9 AM, new users will get sent to bing.com.
- Location
   - The 'location' type changes where it is pointing to based on the user's location, this requires the user to get sent to another website temporarily to retrieve their location, but we will get to that a bit further into this guide. The owner can set specific zones that determine where the user will get sent to. For example, the owner could make it so that if you are located in Sweden, you will be sent to https://sweden.se, but if you were located anywhere else, it would tell you that you are not in a defined zone and that you can't be redirected. Multiple zones are supported.
- User-Agent
   - A QRLink-code with the type 'user-agent' will change where it is pointing to based on what device and/or browser that the user is using. For example, the owner could make it so that if the user is on an Apple device and using the Safari browser to access the handler endpoint, they will get sent to safariforios.extension.com. There is also an option for fallback if the owner sets both the browser and OS to "Any", in which case if none of the other conditions match, they will be sent to the URL specified in the fallback condition. Custom matching using regular expression is also supported both for the browser and for the OS.

At this current moment in time, chaining multiple types is not supported, but can be done by setting the redirection URL to another QRLink-code's handler page.

> [!WARNING]
> Chaining multiple QRLink-codes together where some have the 'location' or 'user-agent' type set **WILL** prompt the user to authorize giving their information multiple times which may get annoying for the user. Please keep this in mind when creating chained QRLink-codes.

## Retrieving information when a user scans the code

QRLink also allows the owner to retrieve information about the scan that the user makes. When creating a QRLink-code on the QRLink dashboard, you will be presented with an option to "Grab information from scans", when selected, the following choices will show up:

- Device Fingerprint
  - The device fingerprint uniquely identifies the device that the user is using, QRLink does this by using the [ClientJS](https://github.com/jackspirou/clientjs) library, you can find more information about how that is done there.
- IP address
  - The IP address could allow the owner to find out what ISP the user is using, or where they are connecting from, this has no real usage at the moment but could be used in some analytical way.
- User-Agent
  - The user-agent is a way that the device tells the website what device and browser that the user is connecting from. Here is an example of what a user-agent could look like: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1`
  - When the QRLink-code's type is set to 'user-agent', this will automatically be enabled and cannot be disabled unless the type is changed from 'user-agent'.
  - You can also mark this information as required, letting the user know that they are only able to continue with the redirection if they share their user-agent.
- Location
  - The location option asks the user to provide their device's location to the QRLink server.
  - When the QRLink-code's type is set to 'location', this will automatically be enabled and cannot be disabled unless the type is changed from 'location'.
  - You can also mark this information as required, letting the user know that they are only able to continue with the redirection if they share their location.

All information gathered from the scan is saved to the database/file under the `scanData` property.

**Timestamp from when the user scanned the QR-code is automatically saved too.**

### Sending information to the redirect URL

QRLink also has the option to send the gathered information to the redirect URL, this is done by providing a `ql_scan` query parameter with a signed JWT token containing the information. This JWT token will be valid for **1 minute**, which should be enough time for the website to get it and verify it.
When this option has been enabled in the settings of the QRLink-code, the owner will have to provide a secret key that will be used to sign the JWT token, this is to prevent the user from tampering with the information.

This is the data structure of the decoded JWT token:
```jsonc
{
  "scanData": {
    "fingerprint": 243471812, // The fingerprint of the user's device (if selected)
    "location": { // The user's coordinates (if selected)
      "latitude": -10.514473,
      "longitude": 105.622559,
      "accuracy": 19.093 // in meters
    },
    "timestamp": "2024-03-11T14:56:49.441Z", // Timestamp of when the code was scanned
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", // The user's user-agent (if selected)
    "ip": "1.2.3.4" // The user's IP address (if selected)
  },
  "iat": 1710169009, // Unix Epoch time (in seconds) of when the JWT token was issued
  "exp": 1710169069  // Unix Epoch time (in seconds) of when the JWT token will expire 
}
```

## Storage (Database & File)

QRLink supports 2 methods of storing the QRLink-codes, the primary one, which is a MongoDB database, and a backup one, a file (located at `/srv/QRLink/qrcodes.jsonc` on Linux and `%USERPROFILE%\Documents\QRLink\qrcodes.jsonc` on Windows).

The database is configurable in the `.env` file (you can find a template of it [here](https://github.com/newseedit/dynamic-qr-link/blob/main/NextJS/.env.template))

You do not need to configure the database for QRLink, because QRLink will automatically detect a non-secure configuration and will attempt to configure it automatically (you will be warned 10 seconds before it happens so you have time to stop it if you do not wish to configure it). If QRLink is unable to automatically configure the database, you will be given a step-by-step instruction on how to configure it yourself. QRLink will not use the database as a storage method if it does not consider it to be secure.

Automatic configuration for Windows is not yet supported.

The conditions for QRLink to consider a MongoDB database as valid are as follows:
- A user with no credentials shall not be able to read or modify entries in the database.
- The database user provided in the `.env` file shall have a password.
- The database user provided in the `.env` file shall have valid credentials.
- The database user provided in the `.env` file shall have read and write access to the "QRLink" database and the "qrcodes" collection (will be created during automatic configuration).

If QRLink is unable to connect to the database or considers it not to be valid or cannot configure it to be valid, it will switch to the backup storage option (file). The running user has to have read and write access to the file path provided above. QRLink will also attempt to create these folders if they do not exist.


## Authentication

QRLink uses Authkit (made by WorkOS) to authenticate users to QRLink's systems. Please make sure you configure your instance of Authkit and supply valid API credentials in the `.env` file. More information can be found at [Authkit's website](https://workos.com/docs/user-management)

## Server Configuration

If you wish to run QRLink on a server, files for configuration can be found in the [`server/` directory](https://github.com/newseedit/dynamic-qr-link/blob/main/server). You will also find some helpful one-liners to automatically upload, build, and configure QRLink on a server (you are required to install some tools before-hand).

QRLink uses NGINX to provide HTTPS support as well as managing when the frontend and backend would fail to function appropriately, in which case, the user will be sent to the [`unavailable.html` found here](https://github.com/newseedit/dynamic-qr-link/blob/main/server/resources/unavailable.html)

In the `server/resources/` folder, you will be able to find the appropriate NGINX configuration to use. Make sure to adjust it to your needs.
You also need to symlink the systemd service from `/opt/QRLink/server/resources/QRLink.server` to `/lib/systemd/system/`, you can do so using the following commands:
```bash
ln -s /opt/QRLink/server/resources/QRLink.service /lib/systemd/system/QRLink.service
chmod 644 /lib/systemd/system/QRLink.service
```

After the NGINX configuration file has been installed and enabled, upload all files to the server and run `/opt/QRLink/server/resources/setup.sh` as root.

> [!NOTE]
> To run the setup.sh file, you need to create the `appuser` user as well as the `project-manager` group. Keep in mind that by default, QRLink's location on the server will be /opt/QRLink and that is hardcoded in the setup.sh & configuration.sh files. If you wish to change the directory, you need to change those files as well.

Due to security precautions, we have made it so that the server runs the NextJS framework as the `appuser` user. Unless you are very knowledged in the Linux area, this is not changeable.

## Troubleshooting

In case something goes catastrophically wrong, make sure that the following is true:
- The NodeJS dependencies are up to date: `npm update --prefix /opt/QRLink/NextJS`
- Port :8080, :80, and :443 are not in use: `sudo lsof -i :8080,443,80 | grep "LISTEN"`
- The `appuser` user has permission to listen on port :8080\: `sudo -u appuser nc -lvnp 8080`
- `root` user has permission to listen on port :80 and :443\: `sudo nc -lvnp 80` & `sudo nc -lvnp 443` 
- Your SSL certificate is valid: `sudo openssl verify /path/to/chain.pem`
- There are no very hard to understand errors in the console
- You have googled the errors in the console and searched for ways to fix it

If everything turns upside-down, feel free to contact me at [`me@inimicalpart.com`](mailto:me@inimicalpart.com?subject=I%20need%20help%20with%20QRLink&body=Please%20describe%20your%20issue%20in%20high20detail%20and%20provide20screenshots%20if%20possible.) and I will try to help.

## To the employees at NewSeed IT Solutions AB
I want to thank you all for a wonderful time, and I hope we get to meet each other again soon! I had a lovely time :)
> I am writing this in advance, I am not trying to leave! 😂
