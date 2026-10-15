import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Failure, Loading } from '../../components/common/Feedback'
import { useWorkspace } from '../../features/organizations'
import { BusinessIdentitySection } from '../../features/organizations/components/BusinessIdentitySection'
import { EmailAccountCard } from '../../features/organizations/components/EmailAccountCard'
import { EmailAccountForm } from '../../features/organizations/components/EmailAccountForm'
import { SettingsSectionHeading } from '../../features/organizations/components/SettingsSectionHeading'
import { WorkspaceSettingsForm } from '../../features/organizations/components/WorkspaceSettingsForm'
import { settingsSections } from '../../features/organizations/components/settings.constants'
import type { SettingsSection } from '../../features/organizations/components/settings.types'
import { useOrganizationSettings } from '../../features/organizations/hooks/useOrganizationSettings'
import type { EmailAccount } from '../../types/organization.types'

export function SettingsPage() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId' })
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const canManage =
    workspace.current_user_role === 'owner' || workspace.current_user_role === 'admin'
  const isOwner = workspace.current_user_role === 'owner'
  const api = useOrganizationSettings(organizationId, canManage)
  const [section, setSection] = useState<SettingsSection>('general')
  const [confirmName, setConfirmName] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [editingEmail, setEditingEmail] = useState<EmailAccount | null>(null)

  if (api.settings.isPending || api.accounts.isPending || api.options.isPending) return <Loading />
  if (api.settings.isError || api.accounts.isError || api.options.isError)
    return (
      <Failure
        error={
          api.settings.error ??
          api.accounts.error ??
          api.options.error ??
          new Error('Could not load settings.')
        }
        retry={() => {
          void api.settings.refetch()
          void api.accounts.refetch()
          void api.options.refetch()
        }}
      />
    )
  const settings = api.settings.data
  const visible = settingsSections.filter(
    ([id]) =>
      !(['people', 'activity'].includes(id) && !canManage) && !(id === 'danger' && !isOwner),
  )

  async function downloadExport() {
    const response = await api.downloadExport.mutateAsync()
    const disposition = response.headers['content-disposition'] as string | undefined
    const filename =
      disposition?.match(/filename="([^"]+)"/)?.[1] ?? `${workspace.slug}-export.json`
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const initials = workspace.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <Stack spacing={3.5} sx={{ maxWidth: 1240 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2.5}
          sx={{ alignItems: { sm: 'center' }, position: 'relative', zIndex: 1 }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.selected',
              color: 'primary.main',
              typography: 'subtitle2',
              fontWeight: 700,
            }}
          >
            {initials}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h3" component="h1" sx={{ overflowWrap: 'anywhere' }}>
              {workspace.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: '65ch' }}>
              One place for company identity, ERP defaults, access, communication, and data
              governance.
            </Typography>
          </Box>
          <Chip
            label={workspace.current_user_role ?? 'Member'}
            sx={{
              alignSelf: { xs: 'flex-start', sm: 'center' },
              textTransform: 'capitalize',
            }}
          />
        </Stack>
      </Paper>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '240px minmax(0, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Paper
          component="nav"
          aria-label="Settings sections"
          elevation={0}
          sx={{
            p: 1,
            position: { md: 'sticky' },
            top: { md: 24 },
            overflowX: { xs: 'auto', md: 'visible' },
            borderRadius: 3,
            bgcolor: 'rgba(18,57,84,.045)',
          }}
        >
          <Stack
            direction={{ xs: 'row', md: 'column' }}
            spacing={0.5}
            sx={{ minWidth: { xs: 'max-content', md: 0 } }}
          >
            {visible.map(([id, label, Icon]) => (
              <Button
                key={id}
                startIcon={<Icon sx={{ fontSize: 19 }} />}
                variant="text"
                onClick={() => setSection(id)}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 1.15,
                  borderRadius: 2,
                  color: section === id ? 'primary.dark' : 'text.secondary',
                  bgcolor: section === id ? 'background.paper' : 'transparent',
                  boxShadow: section === id ? '0 8px 24px rgba(18,57,84,.09)' : 'none',
                  transition:
                    'transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms cubic-bezier(.2,.8,.2,1)',
                  '&:hover': {
                    bgcolor: section === id ? 'background.paper' : 'rgba(255,255,255,.65)',
                    transform: 'translateX(2px)',
                  },
                }}
              >
                {label}
              </Button>
            ))}
          </Stack>
        </Paper>
        <Box
          sx={{
            p: 0.75,
            borderRadius: 4,
            bgcolor: 'rgba(18,57,84,.055)',
            boxShadow: 'inset 0 0 0 1px rgba(18,57,84,.04)',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 4 },
              minHeight: 520,
              borderRadius: 3.25,
              boxShadow: '0 18px 50px rgba(18,57,84,.08)',
              animation: 'settingsIn 420ms cubic-bezier(.2,.8,.2,1)',
              '@keyframes settingsIn': {
                from: { opacity: 0, transform: 'translateY(8px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Stack spacing={3}>
              {section === 'general' && (
                <>
                  <SettingsSectionHeading
                    title="General & regional"
                    description="Control the language, time zone, and sender identity used by this workspace."
                  />
                  <WorkspaceSettingsForm
                    initial={settings}
                    readOnly={!canManage}
                    save={api.saveSettings.mutateAsync}
                    fields={[
                      { name: 'timezone', label: 'Time zone', options: api.options.data.timezones },
                      {
                        name: 'locale',
                        label: 'Language and regional format',
                        options: api.options.data.locales,
                      },
                      {
                        name: 'default_from_name',
                        label: 'Default sender name',
                        helper: 'Used when a message does not provide a more specific sender name.',
                        wide: true,
                      },
                    ]}
                  />
                </>
              )}
              {section === 'business' && (
                <BusinessIdentitySection
                  settings={settings}
                  readOnly={!canManage}
                  save={api.saveSettings.mutateAsync}
                />
              )}
              {section === 'erp' && (
                <>
                  <SettingsSectionHeading
                    title="ERP defaults"
                    description="Safe defaults for future commercial documents. Each document may override them later."
                  />
                  <WorkspaceSettingsForm
                    initial={settings}
                    readOnly={!canManage}
                    save={api.saveSettings.mutateAsync}
                    fields={[
                      {
                        name: 'currency',
                        label: 'Base currency',
                        helper: 'Three-letter code, for example EUR.',
                      },
                      {
                        name: 'fiscal_year_start_month',
                        label: 'Fiscal year starts in month',
                        type: 'number',
                      },
                      { name: 'default_tax_rate', label: 'Default tax rate (%)', type: 'number' },
                      {
                        name: 'default_payment_terms_days',
                        label: 'Default payment terms (days)',
                        type: 'number',
                      },
                      {
                        name: 'document_prefix',
                        label: 'Document prefix',
                        helper: 'Example: INV. This does not create invoices yet.',
                      },
                      {
                        name: 'next_document_number',
                        label: 'Next document number',
                        type: 'number',
                      },
                    ]}
                  />
                  <Alert severity="info">
                    These settings prepare the ERP. Invoice creation will be a separate audited
                    feature.
                  </Alert>
                </>
              )}
              {section === 'email' && (
                <>
                  <SettingsSectionHeading
                    title="Email connections"
                    description="Choose which SMTP connection sends workspace invitations and later automated messages."
                  />
                  {api.accounts.data.map((account) => (
                    <EmailAccountCard
                      key={account.id}
                      account={account}
                      canManage={canManage}
                      edit={() => setEditingEmail(account)}
                      makeDefault={() =>
                        void api.updateAccount.mutateAsync({
                          accountId: account.id,
                          body: { is_default: true },
                        })
                      }
                      remove={() => void api.deleteAccount.mutateAsync(account.id)}
                      test={(recipient) =>
                        void api.testAccount.mutateAsync({ accountId: account.id, recipient })
                      }
                    />
                  ))}
                  {api.accounts.data.length === 0 && (
                    <Alert severity="info">
                      No workspace connection exists. Invitations use the installation fallback when
                      available.
                    </Alert>
                  )}
                  {canManage && !addingEmail && (
                    <Button
                      variant="outlined"
                      onClick={() => setAddingEmail(true)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Add email connection
                    </Button>
                  )}
                  {addingEmail && (
                    <EmailAccountForm
                      save={api.createAccount.mutateAsync}
                      cancel={() => setAddingEmail(false)}
                    />
                  )}
                  {editingEmail && (
                    <EmailAccountForm
                      account={editingEmail}
                      save={(body) =>
                        api.updateAccount.mutateAsync({ accountId: editingEmail.id, body })
                      }
                      cancel={() => setEditingEmail(null)}
                    />
                  )}
                </>
              )}
              {section === 'people' && (
                <>
                  <SettingsSectionHeading
                    title="People & permissions"
                    description="Invite colleagues, change roles, or remove access from this workspace."
                  />
                  <Alert severity="info">
                    Owners manage administrators and ownership. Administrators manage members and
                    viewers.
                  </Alert>
                  <Button
                    variant="contained"
                    onClick={() =>
                      void navigate({
                        to: '/organizations/$organizationId/members',
                        params: { organizationId },
                      })
                    }
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Open people management
                  </Button>
                </>
              )}
              {section === 'activity' && (
                <>
                  <SettingsSectionHeading
                    title="Workspace activity"
                    description="The latest important administration changes inside this workspace."
                  />
                  {api.activity.isPending && <Loading />}
                  {api.activity.isError && (
                    <Alert severity="error">The activity history could not be loaded.</Alert>
                  )}
                  {api.activity.data?.length === 0 && (
                    <Typography color="text.secondary">No changes recorded yet.</Typography>
                  )}
                  {api.activity.data?.map((event) => (
                    <Box key={event.id}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        sx={{ justifyContent: 'space-between', gap: 1 }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 650 }}>{event.action}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            By {event.actor}
                            {event.target ? ` · Affected: ${event.target}` : ''}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(event.created_at).toLocaleString()}
                        </Typography>
                      </Stack>
                      <Divider sx={{ mt: 1.5 }} />
                    </Box>
                  ))}
                </>
              )}
              {section === 'danger' && (
                <>
                  <SettingsSectionHeading
                    title="Export & danger zone"
                    description="Download a portable copy before an irreversible workspace change."
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Download workspace data</Typography>
                    <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                      Includes CRM records and non-secret settings. It is not a restorable database
                      backup.
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => void downloadExport()}
                      disabled={api.downloadExport.isPending}
                    >
                      {api.downloadExport.isPending ? 'Preparing…' : 'Download JSON export'}
                    </Button>
                  </Box>
                  <Divider />
                  {workspace.is_personal ? (
                    <Alert severity="info">Personal workspaces cannot be deleted.</Alert>
                  ) : (
                    <Box>
                      <Typography color="error" sx={{ fontWeight: 700 }}>
                        Delete workspace permanently
                      </Typography>
                      <Typography color="text.secondary" sx={{ my: 1.5 }}>
                        This removes companies, contacts, members, and settings. Download an export
                        first.
                      </Typography>
                      <TextField
                        fullWidth
                        label={`Type “${workspace.name}” to confirm`}
                        value={confirmName}
                        onChange={(event) => setConfirmName(event.target.value)}
                      />
                      <Button
                        color="error"
                        variant="contained"
                        disabled={
                          confirmName !== workspace.name || api.deleteOrganization.isPending
                        }
                        onClick={async () => {
                          await api.deleteOrganization.mutateAsync()
                          await navigate({ to: '/' })
                        }}
                        sx={{ mt: 2 }}
                      >
                        {api.deleteOrganization.isPending ? 'Deleting…' : 'Delete workspace'}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Stack>
  )
}
