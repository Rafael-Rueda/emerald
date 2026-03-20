"use client";

import React from "react";
import { PublicShell } from "@emerald/ui/shells";
import {
  SidebarProvider,
  useSidebarSlot,
} from "@/modules/navigation";

/**
 * DocsShell — wraps PublicShell with sidebar context support.
 *
 * The ReadingShell (rendered inside pages) injects sidebar content
 * via SidebarProvider context, and this shell reads it to populate
 * the PublicShell's sidebar slot.
 */
export function DocsShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DocsShellInner>{children}</DocsShellInner>
    </SidebarProvider>
  );
}

function DocsShellInner({ children }: { children: React.ReactNode }) {
  const sidebarContent = useSidebarSlot();

  return (
    <PublicShell sidebar={sidebarContent}>{children}</PublicShell>
  );
}
