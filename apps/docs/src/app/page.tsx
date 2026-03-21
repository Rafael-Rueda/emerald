import { redirect } from "next/navigation";
import { resolveDefaultRedirectPath } from "./default-route-server-data";

/**
 * Root page — redirects to the canonical default docs route.
 *
 * The public docs entry point always resolves to the default
 * space/version/slug so there is never a dead landing page.
 */
export default async function HomePage() {
  const redirectPath = await resolveDefaultRedirectPath();
  redirect(redirectPath);
}
