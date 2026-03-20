import { redirect } from "next/navigation";
import {
  MOCKED_DEFAULT_CONTEXT,
  buildCanonicalPath,
} from "@/modules/documentation";

/**
 * Root page — redirects to the canonical default docs route.
 *
 * The public docs entry point always resolves to the default
 * space/version/slug so there is never a dead landing page.
 */
export default function HomePage() {
  redirect(buildCanonicalPath(MOCKED_DEFAULT_CONTEXT));
}
