import type { Metadata } from "next";
import { AppProviders } from "@emerald/ui/providers";
import { PublicShell } from "@emerald/ui/shells";
import { MswInit } from "./msw-init";
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <MswInit>
          <AppProviders>
            <PublicShell>{children}</PublicShell>
          </AppProviders>
        </MswInit>
      </body>
    </html>
  );
}
