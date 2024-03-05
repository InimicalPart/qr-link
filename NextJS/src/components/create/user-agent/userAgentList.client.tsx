import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";



export default function UserAgentList({
    currentUserAgentList,
    setCurrentUserAgentList
}:{
    currentUserAgentList: {
        browser: string,
        browser_is_regex?: boolean,
        browser_name?: string,
        
        os: string,
        os_is_regex?: boolean,
        os_name?: string,
        
        redirect_to: string,
        after_expiry?: string
    }[],
    setCurrentUserAgentList: (value: {
        browser: string,
        browser_is_regex?: boolean,
        browser_name?: string,

        os: string,
        os_is_regex?: boolean,
        os_name?: string,
        
        redirect_to: string,
        after_expiry?: string
    }[]) => void

}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [translation, setTranslation] = useState("human")
    let bottomMargin = -10
    const userAgentList: {
        browser: string,
        browser_is_regex?: boolean,
        browser_name?: string,

        os: string,
        os_is_regex?: boolean,
        os_name?: string,
        
        redirect_to: string,
        after_expiry?: string
    }[] = currentUserAgentList


        useEffect(() => {},
        [userAgentList]);

        useEffect(() => {
            function handleChange() {            
                startTransition(() => {
                  // Refresh the current route and fetch new data from the server without
                  // losing client-side browser or React state.
                  router.refresh();
                });
              }
            window.addEventListener('refreshUserAgentList', () => {
                handleChange()
            });
          }, [router]);
        
        function deleteAction(el:any) {
            let userAgentLoc = el.target.getAttribute("data-loc")
            let userAgentListCopy = [...userAgentList]
            let userAgentLocSplit = userAgentLoc.split(".")
            let browserName = userAgentLocSplit[0]
            let osName = userAgentLocSplit[1]


            if (userAgentLocSplit.length === 2) {
                // delete the entire browser/os
                userAgentListCopy = userAgentListCopy.filter((item) => item.browser !== browserName || item.os !== osName)
            } else if (userAgentLocSplit.length === 3) {
                // delete the after_expiry
                let index = userAgentListCopy.findIndex((item) => item.browser === browserName || item.os === osName)
                delete userAgentListCopy[index].after_expiry
            }

            

            setCurrentUserAgentList(userAgentListCopy)
            window.dispatchEvent(new CustomEvent("refreshUserAgentList"));

        }

        function generateUserAgentList() {
            return (
                <ul style={{ listStyle: "disc", fontSize: "11pt" }}>
                    {userAgentList.map((listItem:{
                        browser: string,
                        browser_is_regex?: boolean,
                        browser_name?: string,
                        browser_name_pretty?: string,


                        os: string,
                        os_is_regex?: boolean,
                        os_name?: string,
                        os_name_pretty?: string,

                        redirect_to: string,
                        after_expiry?: string,
                    }) => {
                        // browser/device can be a regex string (ending in whatever), "any" (browser only) or a specific browser/device
                        let browserName = listItem.browser_name ?? listItem.browser;
                        let osName = listItem.os_name ?? listItem.os;

                        let browserNamePretty = listItem.browser_name_pretty ?? browserName;
                        let osNamePretty = listItem.os_name_pretty ?? osName;

                        let redirect_to = listItem.redirect_to;
                        let after_expiry = listItem.after_expiry;

                        const fallback = browserNamePretty == "Any Browser" && osNamePretty == "Any OS" ? "Any (fallback)" : undefined

                        if (redirect_to.length > 27) {
                            redirect_to = redirect_to.slice(0, 15) + "..." + redirect_to.slice(redirect_to.length - 12);
                        }
                        if (after_expiry) {
                            if (after_expiry.length > 27) {
                                after_expiry = after_expiry.slice(0, 15) + "..." + after_expiry.slice(after_expiry.length - 12);
                            }
                        }
                        return (
                            <li key={browserName + "." + osName} style={{marginBottom:bottomMargin}}>
                                <p style={{cursor:"pointer",marginBottom:bottomMargin/2}} data-loc={browserName + "." + osName} onClick={deleteAction} title="Click to delete">{fallback ? fallback : (browserNamePretty + " on " + osNamePretty)}</p>
                                <ul className="moveover" style={{ listStyle: "disc" }}>
                                    <li style={{marginBottom:bottomMargin}}>
                                        <p style={{display:"inline",position:"relative", verticalAlign:"text-bottom"}}>Redirect to: <i style={{fontWeight: 600}} title={listItem.redirect_to}>{redirect_to}</i></p>
                                    </li>
                                    {after_expiry && <li style={{marginBottom:bottomMargin}}  >
                                        <p onClick={deleteAction} data-loc={browserName + "." + osName + ".after_expiry"} style={{position:"relative",verticalAlign:"text-bottom",cursor:"pointer", display:"inline"}}>After expiry: <i style={{fontWeight: 600,pointerEvents:"none",}} title={listItem.after_expiry}>{after_expiry}</i></p>
                                    </li>}
                                </ul>
                            </li>
                        )
                    })}
                </ul>
            )
        }
        
    return <>
        <p className="qr-info-label flex justify-center items-center flex-wrap">
            <b>Current List:</b>
          </p>
        <div id="userAgentList" style={{
            marginBottom:20,
            fontSize: "11pt",
            left: "50%",
            transform: "translateX(-50%) scale(0.9)",
            position: "relative",
            width: 420,
            display:"flex",
            justifyContent:"center",
}}>
        {currentUserAgentList.length > 0 ? generateUserAgentList() : <i style={{fontSize:14}}>No user-agents defined</i>}
        </div>
    </>
}
