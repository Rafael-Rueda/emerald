"use client";

import React from "react";
import { PublicShell } from "@emerald/ui/shells";
import {
  SidebarProvider,
  useSidebarSlot,
  HeaderControlsProvider,
  useHeaderControlsSlot,
} from "@/modules/navigation";
import { SpaceSelector } from "@/modules/spaces";
import { SearchPanel } from "@/modules/search";

/**
 * DocsShell — wraps PublicShell with sidebar + header controls context.
 *
 * Page-level components (ReadingShell) inject sidebar content and header
 * controls (version selector) via context providers, and this shell reads
 * them to populate PublicShell's slots. The search panel is rendered
 * directly as a shell-level component (reads route via useParams).
 */
export function DocsShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <HeaderControlsProvider>
        <DocsShellInner>{children}</DocsShellInner>
      </HeaderControlsProvider>
    </SidebarProvider>
  );
}

function DocsShellInner({ children }: { children: React.ReactNode }) {
  const sidebarContent = useSidebarSlot();
  const headerControls = useHeaderControlsSlot();

  return (
    <PublicShell
      sidebar={sidebarContent}
      title={<SpaceSelector />}
      headerControls={headerControls}
      headerSearch={<SearchPanel />}
    >
      {children}
    </PublicShell>
  );
}
