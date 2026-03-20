"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceShell } from "@emerald/ui/shells";
import { cn } from "@emerald/ui/lib/cn";

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
    href: "/admin/ai-context",
    label: "AI Context",
    heading: "AI Context",
    match: (pathname) => pathname.startsWith("/admin/ai-context"),
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

export function WorkspaceAdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = normalizePathname(usePathname());
  const activeSection = resolveActiveSection(pathname);

  return (
    <WorkspaceShell
      title={`Workspace Admin · ${activeSection.heading}`}
      navigation={(
        <nav className="space-y-1" data-testid="admin-nav">
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
      )}
    >
      {children}
    </WorkspaceShell>
  );
}
