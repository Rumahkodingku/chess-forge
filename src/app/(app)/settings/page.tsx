import { PageHeader } from "@/components/layout/page-header";
import { SettingsWorkspace } from "@/features/settings/settings-workspace";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Defaults for the workspace, the engine, and local storage. Nothing here leaves this device."
      />
      <SettingsWorkspace />
    </div>
  );
}
