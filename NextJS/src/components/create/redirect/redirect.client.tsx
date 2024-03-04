"use client";

export default function Redirect({
    state,
    qrCodeInfo = {},
    action
}: {
    state: any,
    qrCodeInfo?: any,
    action: string  
}) {
    return (
        <div style={{
            border: "1px solid black",
            paddingBottom: 10,
            paddingTop: 10,
            borderRadius: 8,
            width:300,
            position: "relative",
            left: "50%",
            transform: "translateX(-50%)"
        }}>
            <p className="qr-info-label flex justify-center items-center flex-wrap">
                <b>Redirect to</b>
            </p>
            <textarea
                id="redirect"
                className="disabled:bg-neutral-400"
                placeholder="URL / VCard / ..."
                autoCapitalize="none"
                autoCorrect="none"
                spellCheck="false"
                name="redirect_redirect_to"
                disabled={action !== "redirect"}
                style={{
                    border: state?.redirect_redirect_to ? "1px red solid" : "1px black solid",
                    borderRadius: 8,
                    textAlign: "center",
                    maxHeight: 250,
                    minHeight: 30,
                    height: 30
                }}
                defaultValue={qrCodeInfo.type=="redirect" ? qrCodeInfo.data.redirect_to : ""}>    
            </textarea>
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                fontSize: "9pt",
                color: "red",
                display: state?.redirect_redirect_to ? "block" : "none",
                marginTop: -5,
                marginBottom: -5
            }}>{state?.redirect_redirect_to}</p>
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{marginTop:10}} title="Where to navigate once the QR-code has expired"><b>After Expiry</b> <span style={{
                fontSize: '8pt',
                flexBasis: '100%',
                marginTop: -5
            }}>(optional)</span></p>
            <textarea
                id="AERedirect"
                placeholder="URL / VCard / ..."
                className="disabled:bg-neutral-400"
                autoCapitalize="none"
                autoCorrect="none"
                spellCheck="false"
                style={{
                    border: state?.redirect_after_expiry ? "1px red solid" : "1px black solid",
                    borderRadius: 8,
                    textAlign: "center",
                    maxHeight: 250,
                    minHeight: 30,
                    height: 30
                }}
                disabled={action !== "redirect"}
                name="redirect_after_expiry"
                defaultValue={qrCodeInfo.type=="redirect" ? qrCodeInfo.data.after_expiry : ""}></textarea>
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                fontSize: "9pt",
                color: "red",
                display: state?.redirect_after_expiry ? "block" : "none",
                marginTop: -5,
            }}>{state?.redirect_after_expiry}</p>
        </div>
    )
}