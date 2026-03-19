import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emerald Workspace",
  description: "Workspace administration portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
