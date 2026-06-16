import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Viton ERP",
  description: "Viton ERP",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Viton ERP",
  },
  themeColor: "#e53935",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Viton ERP" />
        <link rel="apple-touch-icon" href="/icon-192.jpg" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
