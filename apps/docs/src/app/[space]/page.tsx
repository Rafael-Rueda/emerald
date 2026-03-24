import { redirect } from "next/navigation";
import { fetchVersions } from "@/modules/versioning";
import { resolveDefaultVersion } from "@/modules/documentation/domain/default-document-context";

/**
 * Space root page — redirects to the default version for this space.
 *
 * Fetches the version list, resolves the default, and redirects to
 * /[space]/[version] so the welcome page loads with sidebar.
 */

interface SpacePageProps {
  params: Promise<{ space: string }>;
}

export default async function SpacePage({ params }: SpacePageProps) {
  const { space } = await params;

  const versionsResult = await fetchVersions(space);

  if (versionsResult.status === "success" && versionsResult.data.versions.length > 0) {
    const defaultVersion = resolveDefaultVersion(versionsResult.data.versions);
    if (defaultVersion) {
      redirect(`/${space}/${defaultVersion.slug}`);
    }
  }

  // Fallback: redirect to space with first version or show error
  redirect(`/${space}/v1`);
}
