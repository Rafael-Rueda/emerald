import type { Metadata } from "next";
import { AppProviders } from "@emerald/ui/providers";
import { themeInitScript } from "@emerald/ui/theme";
import { MswInit } from "./msw-init";
import { DocsShell } from "./docs-shell";
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
      <head>
        {/* Apply theme class before React hydrates to avoid flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <MswInit>
          <AppProviders>
            <DocsShell>{children}</DocsShell>
          </AppProviders>
        </MswInit>
      </body>
    </html>
  );
}
