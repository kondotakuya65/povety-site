import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Prosperax",
  description: "Mutual aid for Nigeria — send help, hold trust, grow together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <div className="min-h-screen">
          <SiteHeader />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
