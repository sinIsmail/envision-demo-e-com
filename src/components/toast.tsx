import { Toaster } from "@/components/ui/toast"

export default function RootLayout({ children }:any) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}