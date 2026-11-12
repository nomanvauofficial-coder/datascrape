import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10b981",
};

export const metadata: Metadata = {
  title: "ScrapeFlow — Turn Any Website Into Structured Data",
  description:
    "Dynamic no-code web data scraping. Paste a category link or any URL, extract products, prices, links, images and tables, then export to CSV or JSON. 1-day free trial, weekly, monthly & lifetime plans.",
  keywords: [
    "web scraper",
    "data extraction",
    "scraping",
    "category scraper",
    "product scraper",
    "CSV export",
    "no-code scraping",
  ],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ScrapeFlow — Turn Any Website Into Structured Data",
    description: "Paste a link, get structured data. Free 1-day trial.",
    siteName: "ScrapeFlow",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
