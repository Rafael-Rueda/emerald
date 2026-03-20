import type { Metadata } from "next";
import { AppProviders } from "@emerald/ui/providers";
import { WorkspaceShell } from "@emerald/ui/shells";
import { themeInitScript } from "@emerald/ui/theme";
import { MswInit } from "./msw-init";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme class before React hydrates to avoid flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <MswInit>
          <AppProviders>
            <WorkspaceShell>{children}</WorkspaceShell>
          </AppProviders>
        </MswInit>
      </body>
    </html>
  );
}
