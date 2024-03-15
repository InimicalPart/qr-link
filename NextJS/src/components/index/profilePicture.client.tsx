"use client";

import Image from "next/image";

export default function ProfilePicture({src,width=75,height=75}:{src:string,width?:number,height?:number}) {


    return (
        <Image loader={() => src} src={src} unoptimized priority={true} width={width} height={height} alt="Profile picture" style={{
            borderRadius: "50%",
            position: "relative",
        }}/>
    )
}