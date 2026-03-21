import {
  DEFAULT_SPACE,
  buildCanonicalPath,
  resolveFirstSlug,
  type DefaultDocumentContext,
} from "@/modules/documentation";
import { MOCKED_DEFAULT_CONTEXT } from "@/modules/documentation/domain/default-document-context";
import { fetchNavigation } from "@/modules/navigation/infrastructure/navigation-api";
import { fetchVersions } from "@/modules/versioning/infrastructure/version-api";

export async function resolveDefaultDocumentContext(): Promise<DefaultDocumentContext> {
  const versionsResult = await fetchVersions(DEFAULT_SPACE);

  if (versionsResult.status !== "success") {
    return MOCKED_DEFAULT_CONTEXT;
  }

  const defaultVersion = versionsResult.data.versions.find((version) => version.isDefault);
  if (!defaultVersion) {
    return MOCKED_DEFAULT_CONTEXT;
  }

  const navigationResult = await fetchNavigation(DEFAULT_SPACE, defaultVersion.slug);

  if (navigationResult.status !== "success") {
    return MOCKED_DEFAULT_CONTEXT;
  }

  const firstSlug = resolveFirstSlug(navigationResult.data.navigation.items);
  if (!firstSlug) {
    return MOCKED_DEFAULT_CONTEXT;
  }

  return {
    space: DEFAULT_SPACE,
    version: defaultVersion.slug,
    slug: firstSlug,
  };
}

export async function resolveDefaultRedirectPath(): Promise<string> {
  const context = await resolveDefaultDocumentContext();
  return buildCanonicalPath(context);
}
