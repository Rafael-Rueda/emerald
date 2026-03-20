import type { ReactNode } from "react";
import { WorkspaceAdminShell } from "./workspace-admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <WorkspaceAdminShell>{children}</WorkspaceAdminShell>;
}
