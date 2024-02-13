import Script from "next/script";
import "leaflet/dist/leaflet.css";
export default function UITestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></Script>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.js"></Script>
      {children}
      <Script src="/res/js/test.js"></Script>
    </>
  );
}
