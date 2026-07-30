"use client";

import { LabConfigTransferPanel } from "@/components/lab-config-transfer-panel";
import { PageHeader } from "@/components/ui";
import { hasPermission, PERMS } from "@/lib/types/wltr";
import { useAuth } from "@/providers/auth-provider";

export default function LabConfigPage() {
  const { me } = useAuth();
  const canEdit = hasPermission(me, PERMS.configEdit);

  return (
    <div>
      <PageHeader
        title="Lab config export / import"
        description="Download configuration as Excel workbooks or bulk-upload changes. Sheets present in the file determine what is imported — bundles only control export scope."
      />
      <LabConfigTransferPanel me={me} canEdit={canEdit} />
    </div>
  );
}
