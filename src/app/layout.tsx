import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commerce",
  description: "Modular monolith ecommerce application"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
