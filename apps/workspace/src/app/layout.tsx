import type { Metadata } from "next";
import { AppProviders } from "@emerald/ui/providers";
import { WorkspaceShell } from "@emerald/ui/shells";
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
      <body className="min-h-screen font-sans antialiased">
        <AppProviders>
          <WorkspaceShell>{children}</WorkspaceShell>
        </AppProviders>
      </body>
    </html>
  );
}
