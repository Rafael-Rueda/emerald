import type { Metadata } from "next";
import { AppProviders } from "@emerald/ui/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emerald Docs",
  description: "Public documentation portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
