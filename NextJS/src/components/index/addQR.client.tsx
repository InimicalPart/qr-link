import Image from "next/image"
import { redirect } from "next/navigation";

export async function AddQR({
    className = ""
}:{
    className?: string    
}) {

    async function addQR() {
        "use server";
        redirect("/create")
    }


    return (
        <form action={addQR} className={"qr select-none cursor-pointer min-h-[150px] md:min-h-[558px] " + className} id="add-qr-form" style={{
            width: "302px",
            height: "auto",
            // border: "1px black solid",
            borderRadius:3,
            justifyContent: "center",
            flexDirection: "column",
            display:'flex',
            pointerEvents: "none",
            order: className.includes("mobile-only") ? -Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER, // This is a hack to make the addQR button always be at the bottom / top of the list, depending on the screen size
        }}>
            <button id="add-qr" style={{
                pointerEvents: "auto",
                width:"100%",
                height:"100%",
                display:"flex",
                justifyContent:"center",
                alignItems:"center",
            }}> 
                <Image src={"/res/img/add_text.png"} height={89} width={188} alt="Add QR" style={{
                    transform: "scale(.825)",
                    margin: "30px 0px"
                }}/>
            </button>
        </form>)
}