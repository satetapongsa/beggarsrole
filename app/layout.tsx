import type { Metadata, Viewport } from "next";
import { Kanit, Pixelify_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import ServiceWorker from "@/components/ServiceWorker";
import { SettingsProvider } from "@/lib/i18n";
import "./globals.css";

const body = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const pixel = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: "SPARE CHANGE — A Street Life Simulator",
  description:
    "You're rolled into a random life on the streets of one of 15 real cities. Survive, find your people, and maybe find a way out.",
  openGraph: {
    title: "SPARE CHANGE — A Street Life Simulator",
    description: "One life. One city you didn't choose. What will you do next?",
    images: ["/api/og"],
  },
  twitter: { card: "summary_large_image", images: ["/api/og"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0907",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${body.variable} ${pixel.variable}`}>
      <body className="font-body antialiased">
        <SettingsProvider>{children}</SettingsProvider>
        <ServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
