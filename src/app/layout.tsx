import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GameProvider } from "@/components/game-provider";
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
  title: "Bingo Adventure · 미션 빙고",
  description: "18개 과제를 빙고판에 배치하고 4팀이 함께 영상 미션에 도전해 보세요.",
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><GameProvider>{children}</GameProvider></body>
    </html>
  );
}
