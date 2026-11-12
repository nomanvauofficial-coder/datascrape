import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
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
