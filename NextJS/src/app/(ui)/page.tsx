import { redirect } from "next/navigation";

export default async function Home() {

    //! / -> /dashboard
    //! To be changed later to a page about QRLink 

    redirect("/dashboard");
}