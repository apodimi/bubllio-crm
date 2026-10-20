import { BackupStatusPanel } from '../../features/installation/components/BackupStatusPanel'
import { InstallationAuditLog } from '../../features/installation/components/InstallationAuditLog'
import { ProductionReadinessCard } from '../../features/installation/components/ProductionReadinessCard'
import { SystemInformationPanel } from '../../features/installation/components/SystemInformationPanel'
import { UpdateCenter } from '../../features/updates/components/UpdateCenter'

export function InstallationOperationsSection() {
  return (
    <>
      <UpdateCenter />
      <ProductionReadinessCard />
      <SystemInformationPanel />
      <InstallationAuditLog />
      <BackupStatusPanel />
    </>
  )
}
