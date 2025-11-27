import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Temporary fallback fonts until actual Geist Mono and Satoshi files are added
const inter = Inter({
  variable: "--font-satoshi",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// TODO: Replace with actual local fonts when available:
// const geistMono = localFont({
//   src: './fonts/GeistMono-Variable.woff2',
//   variable: '--font-geist-mono',
//   display: 'swap',
// });

// const satoshi = localFont({
//   src: './fonts/Satoshi-Variable.woff2',
//   variable: '--font-satoshi',
//   display: 'swap',
// });

export const metadata: Metadata = {
  title: "AdMind By Saif",
  description: "Modern design system with Iridium & Photon color palette, featuring dark-first approach and professional typography.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
