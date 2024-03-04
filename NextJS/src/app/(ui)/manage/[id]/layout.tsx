import Script from "next/script"
import "leaflet/leaflet.css";
import UICreateLayout from "@/app/(ui)/create/layout";

export default function UIManageLayout({
    children
}:{
    children: React.ReactNode
}) {
    return (
        <>
            <UICreateLayout>
                {children}
            </UICreateLayout>
        </>
    )
}