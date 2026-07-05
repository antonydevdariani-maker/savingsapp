import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "SweatLock — Earn Your Withdrawals",
  description: "Lock your savings. Complete pushups to withdraw. The savings app that keeps you accountable.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function SweatLockLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-black text-white">{children}</div>;
}
