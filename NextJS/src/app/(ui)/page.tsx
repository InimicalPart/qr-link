import { redirect } from "next/navigation";

export default async function Home() {

    //! / -> /login
    //! To be changed later to a page about QRLink 

    redirect("/login");
}