import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Kula — A Sharing Network for Everything",
    template: "%s | Kula",
  },
  description:
    "Lend, borrow, gift, barter, and exchange time with your community. Kula makes sharing as easy and natural as buying.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Kula",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Kula — A Sharing Network for Everything",
    description:
      "Lend, borrow, gift, barter, and exchange time with your community.",
    siteName: "Kula",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kula — A Sharing Network for Everything",
    description:
      "Lend, borrow, gift, barter, and exchange time with your community.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
