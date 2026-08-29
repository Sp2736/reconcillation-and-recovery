import type { Metadata } from "next";
import { Nunito, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fontDisplay = Nunito({
  weight: ["600", "700"],
  variable: "--font-display",
  subsets: ["latin"],
});

const fontBody = Nunito({
  weight: ["400", "500", "600"],
  variable: "--font-body",
  subsets: ["latin"],
});

const fontMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reconciliation + Recovery",
  description: "Finance-ops control room dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
