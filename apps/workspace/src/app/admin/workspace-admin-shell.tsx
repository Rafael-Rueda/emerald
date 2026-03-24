"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceShell } from "@emerald/ui/shells";
import { cn } from "@emerald/ui/lib/cn";
import { useWorkspaceContext } from "../../modules/shared/application/workspace-context";

interface AdminSection {
  href: string;
  label: string;
  heading: string;
  match: (pathname: string) => boolean;
}

const adminSections: AdminSection[] = [
  {
    href: "/admin/documents",
    label: "Documents",
    heading: "Documents",
    match: (pathname) => pathname === "/admin" || pathname.startsWith("/admin/documents"),
  },
  {
    href: "/admin/navigation",
    label: "Navigation",
    heading: "Navigation",
    match: (pathname) => pathname.startsWith("/admin/navigation"),
  },
  {
    href: "/admin/versions",
    label: "Versions",
    heading: "Versions",
    match: (pathname) => pathname.startsWith("/admin/versions"),
  },
  {
    href: "/admin/spaces",
    label: "Spaces",
    heading: "Spaces",
    match: (pathname) => pathname.startsWith("/admin/spaces"),
  },
  {
    href: "/admin/ai-context",
    label: "AI Context",
    heading: "AI Context",
    match: (pathname) => pathname.startsWith("/admin/ai-context"),
  },
  {
    href: "/admin/users",
    label: "Users",
    heading: "Users",
    match: (pathname) => pathname.startsWith("/admin/users"),
  },
];

function resolveActiveSection(pathname: string): AdminSection {
  return adminSections.find((section) => section.match(pathname)) ?? adminSections[0];
}

function normalizePathname(pathname: string | null): string {
  if (!pathname) {
    return "/admin";
  }

  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
}

function SpaceSelector() {
  const { spaces, activeSpaceId, setActiveSpaceId, isLoading } = useWorkspaceContext();

  if (isLoading) {
    return <div className="h-8 animate-pulse rounded-md bg-muted" />;
  }

  if (spaces.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No spaces available.{" "}
        <Link href="/admin/spaces" className="text-primary underline">Create one</Link>
      </p>
    );
  }

  return (
    <select
      value={activeSpaceId ?? ""}
      onChange={(e) => setActiveSpaceId(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
      data-testid="space-selector"
    >
      {spaces.map((space) => (
        <option key={space.id} value={space.id}>
          {space.name}
        </option>
      ))}
    </select>
  );
}

function VersionSelector() {
  const { versions, activeVersionId, setActiveVersionId, isLoadingVersions, activeSpaceId } = useWorkspaceContext();

  if (!activeSpaceId) {
    return null;
  }

  if (isLoadingVersions) {
    return <div className="h-8 animate-pulse rounded-md bg-muted" />;
  }

  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No versions available.{" "}
        <Link href="/admin/versions" className="text-primary underline">Create one</Link>
      </p>
    );
  }

  return (
    <select
      value={activeVersionId ?? ""}
      onChange={(e) => setActiveVersionId(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
      data-testid="version-selector"
    >
      {versions.map((version) => (
        <option key={version.id} value={version.id}>
          {version.label} ({version.key}){version.isDefault ? " - Default" : ""}
        </option>
      ))}
    </select>
  );
}

export function WorkspaceAdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
  const activeSection = resolveActiveSection(pathname);
  const { activeVersionId } = useWorkspaceContext();

  const prevVersionIdRef = useRef(activeVersionId);

  useEffect(() => {
    const previousVersionId = prevVersionIdRef.current;
    prevVersionIdRef.current = activeVersionId;

    // Skip on first mount (no previous value to compare)
    if (previousVersionId === null && activeVersionId !== null) {
      return;
    }

    // Only redirect when version actually changed (not on first load)
    if (previousVersionId === activeVersionId) {
      return;
    }

    // If on a sub-page (e.g. /admin/documents/123 or /admin/documents/new),
    // redirect to the section root (e.g. /admin/documents)
    if (pathname !== activeSection.href) {
      router.push(activeSection.href);
    }
  }, [activeVersionId, pathname, activeSection.href, router]);

  return (
    <WorkspaceShell
      title={`Workspace Admin · ${activeSection.heading}`}
      navigation={(
        <div className="flex h-full flex-col" data-testid="admin-nav">
          <nav className="flex-1 space-y-1">
            {/* Space selector */}
            <div className="mb-4 space-y-1.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Space
              </p>
              <SpaceSelector />
            </div>

            {/* Version selector */}
            <div className="mb-4 space-y-1.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Version
              </p>
              <VersionSelector />
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            {adminSections.map((section) => {
              const isActive = section.href === activeSection.href;

              return (
                <Link
                  key={section.href}
                  href={section.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    isActive && "bg-accent text-foreground",
                  )}
                >
                  {section.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => {
                void fetch("/api/auth/logout", { method: "POST" }).then(() => {
                  window.location.href = "/admin/login";
                });
              }}
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    >
      <div key={activeVersionId ?? "none"}>
        {children}
      </div>
    </WorkspaceShell>
  );
}
