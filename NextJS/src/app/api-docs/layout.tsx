export const metadata = {
  title: 'QRLink Swagger API Docs',
  description: 'QRLink API Documentation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
