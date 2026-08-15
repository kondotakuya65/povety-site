import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import AppChrome from "@/components/AppChrome";
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
  title: {
    default: "Prosperax",
    template: "%s · Prosperax",
  },
  description: "Mutual aid for Nigeria — send help, hold trust, grow together.",
  applicationName: "Prosperax",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
