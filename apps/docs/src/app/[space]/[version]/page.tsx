import type { Metadata } from "next";
import { WelcomePageClient } from "./welcome-page-client";

export const metadata: Metadata = {
  title: "Emerald Docs",
  description: "Select a document to start reading.",
};

interface VersionPageProps {
  params: Promise<{
    space: string;
    version: string;
  }>;
}

/**
 * Welcome page — workspace and version selected, no document yet.
 *
 * Shows sidebar with navigation loaded and a welcome prompt
 * in the main content area.
 */
export default async function VersionPage({ params }: VersionPageProps) {
  const { space, version } = await params;

  return <WelcomePageClient space={space} version={version} />;
}
