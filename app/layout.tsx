import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ZoomBlocker from "@/components/ZoomBlocker"; // IMPORT THẰNG NÀY VÀO
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/context/AuthContext";
import NetflixAuthGate from "@/components/NetflixAuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Cấu hình Viewport giữ nguyên chuẩn chỉnh
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,   
  viewportFit: "cover",  
};

// Cấu hình Metadata giữ nguyên mượt mà
export const metadata: Metadata = {
  title: "DT MyFlix",
  description: "Personal Streaming App by Duy Thái",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", 
    title: "DT MyFlix",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white selection:bg-red-600 selection:text-white">
        <AuthProvider>
          <NetflixAuthGate>
            <ZoomBlocker /> 
            {children}
            <Analytics />
          </NetflixAuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}