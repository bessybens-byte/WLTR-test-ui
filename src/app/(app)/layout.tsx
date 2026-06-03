import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { PermissionGuard } from "@/components/permission-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PermissionGuard>
        <AppShell>{children}</AppShell>
      </PermissionGuard>
    </AuthGuard>
  );
}
