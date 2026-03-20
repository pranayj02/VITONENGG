import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VITONENGG Portal",
  description: "Purchase Order & Invoice Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
