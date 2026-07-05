import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "SweatLock — Savings with a price",
  description: "Deposit funds. They're locked. To withdraw, you do pushups — AI counts every rep in real time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SweatLock",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark min-h-full antialiased">
      <body className="min-h-full flex flex-col pb-safe bg-black">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
