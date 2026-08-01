import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PD科学社区",
  description: "面向帕金森患者、医生与科研人员的提问交流、文献共读、问卷访谈和招募入口。",
  icons: {
    icon: "/pd-science-logo.png",
    shortcut: "/pd-science-logo.png",
  },
  openGraph: {
    title: "PD科学社区",
    description: "患者、医生、科研人员的帕金森交流空间。",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "PD科学社区",
    description: "患者、医生、科研人员的帕金森交流空间。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
