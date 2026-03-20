"use client";

import React from "react";
import Link from "next/link";
import type { NavigationItem } from "@emerald/contracts";
import { buildCanonicalNavigationLabel } from "@emerald/contracts";

interface SidebarProps {
  items: NavigationItem[];
  activeSlug: string;
  space: string;
  version: string;
  /** Called when a sidebar link is clicked (for mobile sidebar close, etc.) */
  onNavigate?: () => void;
}

/**
 * Sidebar — renders the navigation tree with active-state highlighting.
 *
 * Each item links to its `space/version/slug` route. The active item
 * is visually distinguished. Supports nested items recursively.
 */
export function Sidebar({
  items,
  activeSlug,
  space,
  version,
  onNavigate,
}: SidebarProps) {
  return (
    <nav
      className="space-y-1"
      data-testid="sidebar-nav"
      aria-label="Document navigation"
    >
      {items.map((item) => (
        <SidebarItem
          key={item.id}
          item={item}
          activeSlug={activeSlug}
          space={space}
          version={version}
          depth={0}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

interface SidebarItemProps {
  item: NavigationItem;
  activeSlug: string;
  space: string;
  version: string;
  depth: number;
  onNavigate?: () => void;
}

function SidebarItem({
  item,
  activeSlug,
  space,
  version,
  depth,
  onNavigate,
}: SidebarItemProps) {
  const isActive = item.slug === activeSlug;
  const href = `/${space}/${version}/${item.slug}`;

  return (
    <div>
      <Link
        href={href}
        onClick={onNavigate}
        className={`block rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        aria-current={isActive ? "page" : undefined}
        data-testid={`sidebar-item-${item.slug}`}
      >
        {buildCanonicalNavigationLabel(item.label)}
      </Link>
      {item.children.length > 0 && (
        <div className="ml-2">
          {item.children.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              activeSlug={activeSlug}
              space={space}
              version={version}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
