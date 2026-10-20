import { Link } from '@tanstack/react-router'
import { Button, Typography } from '@mui/material'

import type { Organization } from '../../types/organization.types'

import { AccountSettingsSection } from './AccountSettingsSection'

export function WorkspaceSettingsSection({ organizations }: { organizations?: Organization[] }) {
  return (
    <AccountSettingsSection
      title="Workspace settings"
      description="Company identity, regional preferences, ERP defaults, email connections, people, and workspace data."
    >
      {organizations?.map((organization) => (
        <Link
          key={organization.id}
          to="/organizations/$organizationId/settings"
          params={{ organizationId: organization.id }}
          style={{ alignSelf: 'flex-start', textDecoration: 'none' }}
        >
          <Button component="span" variant="outlined">
            Open {organization.name} settings
          </Button>
        </Link>
      ))}
      {organizations?.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          You do not belong to a workspace yet.
        </Typography>
      ) : null}
    </AccountSettingsSection>
  )
}
