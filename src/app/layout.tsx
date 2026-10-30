import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { QuoteStorageSweep } from "@/components/quote/QuoteStorageSweep";
import { baseOpenGraph, shareImage } from "@/lib/metadata";
import { MOTION_SCRIPT } from "@/lib/motion";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: ${siteConfig.slogan}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    ...baseOpenGraph,
    title: `${siteConfig.name}: ${siteConfig.slogan}`,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image", images: [shareImage] },
};

export const viewport: Viewport = {
  themeColor: "#eef0ec",
  viewportFit: "cover",
};

/**
 * Root shell shared by every route. The marketing pages add the header and
 * footer in `(site)/layout.tsx`; the quote screen at /quote stands alone.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
      // MOTION_SCRIPT sets data-motion before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body>
        <LenisProvider>{children}</LenisProvider>
        <QuoteStorageSweep />
      </body>
    </html>
  );
}
