"use client";

import React from "react";
import Link from "next/link";
import type { BreadcrumbItem } from "../domain/navigation-context";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  space: string;
  version: string;
}

/**
 * Breadcrumbs — renders the navigation trail for the current document.
 *
 * Shows space > version > path segments. The last item is the current
 * page and is not a link.
 */
export function Breadcrumbs({ items, space, version }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      data-testid="breadcrumbs"
      className="flex items-center gap-1 text-sm text-muted-foreground"
    >
      <span data-testid="breadcrumb-space">{space}</span>
      <Separator />
      <span data-testid="breadcrumb-version">{version}</span>
      {items.map((crumb, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={crumb.slug}>
            <Separator />
            {isLast ? (
              <span
                className="font-medium text-foreground"
                aria-current="page"
                data-testid="breadcrumb-current"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.path}
                className="hover:text-foreground transition-colors"
                data-testid={`breadcrumb-link-${crumb.slug}`}
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function Separator() {
  return (
    <span className="text-muted-foreground/50" aria-hidden="true">
      /
    </span>
  );
}
