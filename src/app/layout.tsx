import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TaskPilot",
  description: "Your AI task automation hub",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaskPilot",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No max-scale lock: keep desktop pinch/zoom available.
  themeColor: "#3B82F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="h-full bg-gray-50">
        {/*
          Responsive container:
          - Mobile (<640px): full-width phone look (no artificial 430px cap).
          - sm (≥640px):     430px centred card — the old phone-framed look.
          - lg (≥1024px):    full-width fluid — desktop gets real screen real-estate.
          - xl (≥1280px):    max-w-7xl so ultra-wide screens don't stretch forever.
        */}
        <div className="mx-auto w-full sm:max-w-[430px] lg:max-w-none h-full bg-white sm:shadow-xl lg:shadow-none relative overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
