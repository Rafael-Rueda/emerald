"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceContextProvider } from "../../modules/shared/application/workspace-context";
import { WorkspaceAdminShell } from "./workspace-admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <WorkspaceContextProvider>
      <WorkspaceAdminShell>{children}</WorkspaceAdminShell>
    </WorkspaceContextProvider>
  );
}
