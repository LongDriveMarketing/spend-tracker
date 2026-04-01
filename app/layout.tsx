import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spend Tracker",
  description: "Quick expense logger",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spend",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <head />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
