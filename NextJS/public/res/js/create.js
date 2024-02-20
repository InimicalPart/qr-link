// let authorizationIdentifier = null;

let serverURL = document.getElementById("apiurl").innerText
function generate(link) {
    let qrCodeEl = document.querySelector("#qr-code");
    qrCodeEl.innerHTML = ""; // clear
    new QRCode(qrCodeEl, {
        text: link,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function getDataURL() {
    return document.querySelector("#qr-code canvas").toDataURL()
}
function toDTFormat(date) {
  var padDate = function (num) {
    return (num < 10 ? "0" : "") + num;
  };

  return (
    date.getFullYear() +
    "-" +
    padDate(date.getMonth() + 1) +
    "-" +
    padDate(date.getDate()) +
    "T" +
    padDate(date.getHours()) +
    ":" +
    padDate(date.getMinutes())
  );
}
let lastValue = null
document.getElementById("qr-never-expires-checkbox").addEventListener("change", (evt) => {
    if (evt.target.checked) {
        document.getElementById("qr-expires").disabled = true
        lastValue = document.getElementById("qr-expires").value
        document.getElementById("qr-expires").value = ""
    } else {
        if (!lastValue) lastValue = toDTFormat(new Date())
        document.getElementById("qr-expires").disabled = false
        document.getElementById("qr-expires").value = lastValue
    }
})

document.getElementById("qr-id").addEventListener("input", (evt) => {
    //is space? cancel
    if (evt.target.value.includes(" ")) {
        evt.target.value = evt.target.value.replace(/ /g, "")
        return
    }
    // if longer than 50, cancel
    if (evt.target.value.length > 50) {
        evt.target.value = evt.target.value.substring(0, 50)
        return
    }

    if ((!/^[a-zA-Z0-9_.-]*$/.test(evt.target.value))) {
        evt.target.value = evt.target.value.replace(/[^a-zA-Z0-9_.-]/g, "")
        return
    }

    //cannot start or end with a period or -, and cant contain two periods or - in a row

    if (evt.target.value.length == 0) {
        generate(serverURL + "/qrcode/HiFromDev/handler") // just so it doesn't look empty
    } else {
        generate(serverURL + "/qrcode/" + evt.target.value + "/handler")
    }
})

document.getElementById('qr-code').ondragstart = function() { return false; };

// fetch(document.getElementById("apiurl").innerText+"/srvinfo").then((response) => response.json()).then((data) => {
//     serverURL = data.serverURL
//     document.getElementById("apiurl").remove()
// })
generate(serverURL + "/qrcode/HiFromDev/handler") // just so it doesn't look empty

// function displayExpiredWarning() {
//   return confirm(
//     "The date you entered is in the past. This QR code will be expired immediately, do you want to continue?"
//   );
// }
// document.getElementById("qr-submit").addEventListener("click", () => {
//   let ID = document.getElementById("qr-id").value;
//   let updateKey = document.getElementById("qr-updatekey").value;
//   let expires = document.getElementById("qr-never-expires-checkbox").checked
//     ? null
//     : document.getElementById("qr-expires").value;
//   let name = document.getElementById("qr-name").value;
//   let description = document.getElementById("qr-description").value;
//   let redirectTo = document.getElementById("qr-redir").value;
//   let after_expiry = document.getElementById("qr-redirexp").value;
//   if (expires) {
//     if (new Date(expires) < new Date()) {
//       if (!displayExpiredWarning()) return;
//     }
//   }

//   if (!redirectTo) {
//     alert("You must specify a redirect destination.");
//     document.getElementById("qr-redir").style.border = "2px solid red";
//     document.getElementById("qr-redir").focus();
//     return;
//   }
//   if (ID != "" && !/^[a-zA-Z0-9_.-]*$/.test(ID)) {
//     alert(
//       "ID must contain only alphanumeric characters, underscores, periods, and dashes."
//     );
//     document.getElementById("qr-id").style.border = "2px solid red";
//     document.getElementById("qr-id").focus();
//     return;
//   }

//   if (ID != "" && /^-|-$|^\.|\.$|-{2,99}|\.{2,99}/g.test(ID)) {
//     alert(
//       "ID cannot start or end with a period or -, and cannot contain two periods or - in a row."
//     );
//     document.getElementById("qr-id").style.border = "2px solid red";
//     document.getElementById("qr-id").focus();
//     return;
//   }

//   if (ID.length > 50) {
//     alert("ID must be 50 characters or less.");
//     document.getElementById("qr-id").style.border = "2px solid red";
//     document.getElementById("qr-id").focus();
//     return;
//   }

//   if (description.length > 200) {
//     alert("Description must be 200 characters or less.");
//     document.getElementById("qr-description").style.border = "2px solid red";
//     document.getElementById("qr-description").focus();
//     return;
//   }

//   //disable create
//   document.getElementById("qr-submit").disabled = true;
//   document.getElementById("qr-submit").innerHTML = "Creating...";

//   fetch(apiURL + "/qrcode", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       id: ID == "" ? undefined : ID,
//       update_key: updateKey == "" ? undefined : updateKey,
//       expires,
//       name,
//       description,
//       type: "redirect",
//       data: {
//         redirect_to: redirectTo,
//         after_expiry: after_expiry == "" ? undefined : after_expiry,
//       },
//       identifier: token,
//     }),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       if (data.error) {
//         alert("An error occurred while creating the QR code: " + data.error);
//         document.getElementById("qr-submit").disabled = false;
//         document.getElementById("qr-submit").innerHTML = "Create";
//       } else {
//         console.log("ID: " + data.id);
//         console.log("Update key: " + data.update_key);
//         alert(
//           "QR code created successfully!\nID: " +
//             data.id +
//             "\nUpdate key: " +
//             data.update_key
//         );
//         window.location.href = "/ui";
//       }
//     });
// });
