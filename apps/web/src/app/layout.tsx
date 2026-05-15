import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "CCE LOG — Planification des formations",
    template: "%s | CCE LOG",
  },
  description:
    "Système de planification et d'automatisation des formations CCE LOG — CACES, VR, Sécurité industrielle.",
  keywords: ["CCE LOG", "CACES", "formation", "planification", "Maroc"],
  authors: [{ name: "CCE LOG" }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1B4F8A",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
