import type { WorkspaceSettings } from '../../../types/organization.types'
import { businessIdentityGroups } from './businessIdentity.constants'
import { SettingsSectionHeading } from './SettingsSectionHeading'
import { WorkspaceSettingsForm } from './WorkspaceSettingsForm'

export function BusinessIdentitySection({
  settings,
  readOnly,
  save,
}: {
  settings: WorkspaceSettings
  readOnly: boolean
  save: (values: Partial<WorkspaceSettings>) => Promise<unknown>
}) {
  return (
    <>
      <SettingsSectionHeading
        title="Business identity"
        description="Keep the official details used in documents and customer communication."
      />
      <WorkspaceSettingsForm
        initial={settings}
        readOnly={readOnly}
        save={save}
        groups={businessIdentityGroups}
      />
    </>
  )
}
