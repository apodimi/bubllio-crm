import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  Alert, Box, Button, Chip, Divider, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material'
import BusinessRounded from '@mui/icons-material/BusinessRounded'
import DeleteForeverRounded from '@mui/icons-material/DeleteForeverRounded'
import EmailRounded from '@mui/icons-material/EmailRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import PaymentsRounded from '@mui/icons-material/PaymentsRounded'
import PeopleRounded from '@mui/icons-material/PeopleRounded'
import PublicRounded from '@mui/icons-material/PublicRounded'
import { Failure, Loading } from '../../components/common/Feedback'
import { useWorkspace } from '../../features/organizations'
import { useOrganizationSettings } from '../../features/organizations/hooks/useOrganizationSettings'
import type { EmailAccount, WorkspaceSettings } from '../../types/organization.types'

type Section = 'general' | 'business' | 'email' | 'people' | 'erp' | 'activity' | 'danger'
type Field = {
  name: keyof WorkspaceSettings
  label: string
  helper?: string
  type?: string
  options?: Array<{ value: string | number; label: string }>
  wide?: boolean
}

const sections = [
  ['general', 'General & regional', PublicRounded],
  ['business', 'Business identity', BusinessRounded],
  ['email', 'Email connections', EmailRounded],
  ['people', 'People & permissions', PeopleRounded],
  ['erp', 'ERP defaults', PaymentsRounded],
  ['activity', 'Activity', HistoryRounded],
  ['danger', 'Danger zone', DeleteForeverRounded],
] as const

function Heading({ title, description }: { title: string; description: string }) {
  return <Box sx={{ pb: 1 }}>
    <Typography variant="overline" color="primary.main" sx={{ letterSpacing: '.14em', fontSize: 11 }}>Workspace control</Typography>
    <Typography variant="h5" component="h2" sx={{ mt: 0.35, fontWeight: 750, letterSpacing: '-.025em' }}>{title}</Typography>
    <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 660 }}>{description}</Typography>
  </Box>
}

function SettingsForm({ initial, fields, save, readOnly }: {
  initial: WorkspaceSettings
  fields: Field[]
  save: (values: Partial<WorkspaceSettings>) => Promise<unknown>
  readOnly: boolean
}) {
  const [values, setValues] = useState<Partial<WorkspaceSettings>>(() =>
    Object.fromEntries(fields.map(({ name }) => [name, initial[name]])),
  )
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setState('saving')
    try { await save(values); setState('saved') } catch { setState('error') }
  }
  return <Box component="form" onSubmit={(event) => void submit(event)}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
    {fields.map((field) => <TextField
      key={field.name} label={field.label} value={values[field.name] ?? ''}
      type={field.type ?? 'text'} select={Boolean(field.options)} helperText={field.helper}
      sx={{ gridColumn: field.wide ? '1 / -1' : undefined }}
      disabled={readOnly || state === 'saving'}
      onChange={(event) => {
        setValues((current) => ({ ...current, [field.name]: field.type === 'number' ? Number(event.target.value) : event.target.value }))
        setState('idle')
      }}
    >{field.options?.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>)}
    </Box>
    <Stack spacing={1.5} sx={{ mt: 2.5, alignItems: 'flex-start' }}>
      {readOnly && <Alert severity="info" sx={{ width: '100%' }}>Only workspace owners and admins can change these settings.</Alert>}
      {state === 'saved' && <Alert severity="success" sx={{ width: '100%' }}>Changes saved.</Alert>}
      {state === 'error' && <Alert severity="error" sx={{ width: '100%' }}>The changes could not be saved. Review the fields and try again.</Alert>}
      {!readOnly && <Button type="submit" variant="contained" disabled={state === 'saving'} sx={{ px: 2.5, borderRadius: 99 }}>{state === 'saving' ? 'Saving…' : 'Save changes'}</Button>}
    </Stack>
  </Box>
}

function EmailRow({ account, canManage, makeDefault, remove, edit, test }: {
  account: EmailAccount; canManage: boolean; makeDefault: () => void; remove: () => void; edit: () => void; test: (recipient: string) => void
}) {
  const [recipient, setRecipient] = useState('')
  return <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover', boxShadow: 'inset 0 0 0 1px', color: 'divider' }}><Stack spacing={1.5} sx={{ color: 'text.primary' }}>
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box><Typography sx={{ fontWeight: 700 }}>{account.name}</Typography><Typography variant="body2" color="text.secondary">{account.host}:{account.port} · {account.from_email}</Typography></Box>
      <Chip size="small" color={account.is_default ? 'primary' : 'default'} label={account.is_default ? 'Default' : 'Available'} />
    </Stack>
    {account.last_test_error && <Alert severity="warning">The last delivery test failed.</Alert>}
    {canManage && <><Stack direction="row" spacing={1}>{!account.is_default && <Button size="small" onClick={makeDefault}>Make default</Button>}<Button size="small" onClick={edit}>Edit</Button><Button size="small" color="error" onClick={remove}>Delete</Button></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 1 }}><TextField size="small" label="Test recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} sx={{ flex: 1 }} /><Button size="small" variant="outlined" disabled={!recipient} onClick={() => test(recipient)}>Send test</Button></Stack></>}
  </Stack></Paper>
}

function NewEmailConnection({ account, save, cancel }: {
  account?: EmailAccount
  save: (body: Record<string, unknown>) => Promise<unknown>
  cancel: () => void
}) {
  const [values, setValues] = useState({
    name: account?.name ?? '', host: account?.host ?? '', port: String(account?.port ?? 587), username: account?.username ?? '', password: '', from_email: account?.from_email ?? '', from_name: account?.from_name ?? '', security: account?.use_ssl ? 'ssl' : 'starttls',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      await save({
        name: values.name, host: values.host, port: Number(values.port), username: values.username,
        ...(values.password ? { password: values.password } : {}), from_email: values.from_email, from_name: values.from_name,
        use_tls: values.security === 'starttls', use_ssl: values.security === 'ssl', is_default: true, is_active: true,
      })
      cancel()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The connection could not be saved.')
    } finally { setSaving(false) }
  }
  const field = (name: keyof typeof values, label: string, type = 'text') => <TextField
    label={label} type={type} value={values[name]} required={name !== 'from_name' && !(name === 'password' && account)} disabled={saving}
    onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
  />
  return <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3, bgcolor: 'action.hover' }}><Stack component="form" onSubmit={(event) => void submit(event)} spacing={2}>
    <Typography variant="h6">{account ? 'Edit SMTP connection' : 'New SMTP connection'}</Typography>
    {field('name', 'Connection name')}{field('host', 'SMTP hostname')}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>{field('port', 'Port', 'number')}<TextField select fullWidth label="Security" value={values.security} onChange={(event) => setValues((current) => ({ ...current, security: event.target.value }))}><MenuItem value="starttls">STARTTLS</MenuItem><MenuItem value="ssl">SSL/TLS</MenuItem></TextField></Stack>
    {field('username', 'SMTP username')}{field('password', account ? 'New SMTP password (optional)' : 'SMTP password', 'password')}
    {field('from_email', 'Sender email', 'email')}{field('from_name', 'Sender display name')}
    {error && <Alert severity="error">{error}</Alert>}
    <Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save connection'}</Button><Button onClick={cancel} disabled={saving}>Cancel</Button></Stack>
  </Stack></Paper>
}

export function SettingsPage() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId' })
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const canManage = workspace.current_user_role === 'owner' || workspace.current_user_role === 'admin'
  const isOwner = workspace.current_user_role === 'owner'
  const api = useOrganizationSettings(organizationId, canManage)
  const [section, setSection] = useState<Section>('general')
  const [confirmName, setConfirmName] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [editingEmail, setEditingEmail] = useState<EmailAccount | null>(null)

  if (api.settings.isPending || api.accounts.isPending || api.options.isPending) return <Loading />
  if (api.settings.isError || api.accounts.isError || api.options.isError) return <Failure error={api.settings.error ?? api.accounts.error ?? api.options.error ?? new Error('Could not load settings.')} retry={() => { void api.settings.refetch(); void api.accounts.refetch(); void api.options.refetch() }} />
  const settings = api.settings.data
  const visible = sections.filter(([id]) => !(['people', 'activity'].includes(id) && !canManage) && !(id === 'danger' && !isOwner))

  async function downloadExport() {
    const response = await api.downloadExport.mutateAsync()
    const disposition = response.headers['content-disposition'] as string | undefined
    const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? `${workspace.slug}-export.json`
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click()
    URL.revokeObjectURL(url)
  }

  const initials = workspace.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return <Stack spacing={3.5} sx={{ maxWidth: 1240 }}>
    <Paper elevation={0} sx={{ position: 'relative', overflow: 'hidden', p: { xs: 3, sm: 4 }, borderRadius: 4, color: '#fff', background: 'linear-gradient(125deg, #0f1f38 0%, #005bef 58%, #1473ff 100%)', boxShadow: '0 22px 60px rgba(15,31,56,.18)', '&::after': { content: '""', position: 'absolute', width: 280, height: 280, borderRadius: '50%', right: -90, top: -150, bgcolor: 'rgba(255,255,255,.09)' } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { sm: 'center' }, position: 'relative', zIndex: 1 }}>
        <Box sx={{ width: 64, height: 64, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.14)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22)', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 22 }}>{initials}</Box>
        <Box sx={{ flex: 1 }}><Typography variant="overline" sx={{ color: 'rgba(255,255,255,.72)', letterSpacing: '.16em' }}>Organization workspace</Typography><Typography variant="h3" sx={{ fontSize: { xs: 28, sm: 36 }, mt: 0.25 }}>{workspace.name}</Typography><Typography sx={{ color: 'rgba(255,255,255,.78)', mt: 0.7, maxWidth: 680 }}>One place for company identity, ERP defaults, access, communication, and data governance.</Typography></Box>
        <Chip label={workspace.current_user_role ?? 'Member'} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, textTransform: 'capitalize', color: '#fff', bgcolor: 'rgba(255,255,255,.14)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)' }} />
      </Stack>
    </Paper>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
      <Paper component="nav" aria-label="Settings sections" elevation={0} sx={{ p: 1, position: { md: 'sticky' }, top: { md: 24 }, overflowX: { xs: 'auto', md: 'visible' }, borderRadius: 3, bgcolor: 'rgba(18,57,84,.045)' }}>
        <Stack direction={{ xs: 'row', md: 'column' }} spacing={0.5} sx={{ minWidth: { xs: 'max-content', md: 0 } }}>
          {visible.map(([id, label, Icon]) => <Button key={id} startIcon={<Icon sx={{ fontSize: 19 }} />} variant="text" onClick={() => setSection(id)} sx={{ justifyContent: 'flex-start', px: 1.5, py: 1.15, borderRadius: 2, color: section === id ? 'primary.dark' : 'text.secondary', bgcolor: section === id ? 'background.paper' : 'transparent', boxShadow: section === id ? '0 8px 24px rgba(18,57,84,.09)' : 'none', transition: 'transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms cubic-bezier(.2,.8,.2,1)', '&:hover': { bgcolor: section === id ? 'background.paper' : 'rgba(255,255,255,.65)', transform: 'translateX(2px)' } }}>{label}</Button>)}
        </Stack>
      </Paper>
      <Box sx={{ p: 0.75, borderRadius: 4, bgcolor: 'rgba(18,57,84,.055)', boxShadow: 'inset 0 0 0 1px rgba(18,57,84,.04)' }}><Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, minHeight: 520, borderRadius: 3.25, boxShadow: '0 18px 50px rgba(18,57,84,.08)', animation: 'settingsIn 420ms cubic-bezier(.2,.8,.2,1)', '@keyframes settingsIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}><Stack spacing={3}>
        {section === 'general' && <><Heading title="General & regional" description="Control the language, time zone, and sender identity used by this workspace." /><SettingsForm initial={settings} readOnly={!canManage} save={api.saveSettings.mutateAsync} fields={[
          { name: 'timezone', label: 'Time zone', options: api.options.data.timezones },
          { name: 'locale', label: 'Language and regional format', options: api.options.data.locales },
          { name: 'default_from_name', label: 'Default sender name', helper: 'Used when a message does not provide a more specific sender name.', wide: true },
        ]} /></>}
        {section === 'business' && <><Heading title="Business identity" description="Official details for future offers, invoices, emails, and reports." /><SettingsForm initial={settings} readOnly={!canManage} save={api.saveSettings.mutateAsync} fields={[
          { name: 'legal_name', label: 'Legal business name' }, { name: 'trading_name', label: 'Trading name' },
          { name: 'tax_id', label: 'Tax / VAT number' }, { name: 'tax_office', label: 'Tax office' },
          { name: 'registration_number', label: 'Registration number (for example GEMI)' },
          { name: 'business_email', label: 'Business email', type: 'email' }, { name: 'phone', label: 'Phone' },
          { name: 'website', label: 'Website', type: 'url' }, { name: 'address_line_1', label: 'Address', wide: true },
          { name: 'address_line_2', label: 'Address line 2', wide: true }, { name: 'city', label: 'City' },
          { name: 'postal_code', label: 'Postal code' }, { name: 'country', label: 'Country code', helper: 'Use two letters, for example GR.' },
        ]} /></>}
        {section === 'erp' && <><Heading title="ERP defaults" description="Safe defaults for future commercial documents. Each document may override them later." /><SettingsForm initial={settings} readOnly={!canManage} save={api.saveSettings.mutateAsync} fields={[
          { name: 'currency', label: 'Base currency', helper: 'Three-letter code, for example EUR.' },
          { name: 'fiscal_year_start_month', label: 'Fiscal year starts in month', type: 'number' },
          { name: 'default_tax_rate', label: 'Default tax rate (%)', type: 'number' },
          { name: 'default_payment_terms_days', label: 'Default payment terms (days)', type: 'number' },
          { name: 'document_prefix', label: 'Document prefix', helper: 'Example: INV. This does not create invoices yet.' },
          { name: 'next_document_number', label: 'Next document number', type: 'number' },
        ]} /><Alert severity="info">These settings prepare the ERP. Invoice creation will be a separate audited feature.</Alert></>}
        {section === 'email' && <><Heading title="Email connections" description="Choose which SMTP connection sends workspace invitations and later automated messages." />
          {api.accounts.data.map((account) => <EmailRow key={account.id} account={account} canManage={canManage} edit={() => setEditingEmail(account)} makeDefault={() => void api.updateAccount.mutateAsync({ accountId: account.id, body: { is_default: true } })} remove={() => void api.deleteAccount.mutateAsync(account.id)} test={(recipient) => void api.testAccount.mutateAsync({ accountId: account.id, recipient })} />)}
          {api.accounts.data.length === 0 && <Alert severity="info">No workspace connection exists. Invitations use the installation fallback when available.</Alert>}
          {canManage && !addingEmail && <Button variant="outlined" onClick={() => setAddingEmail(true)} sx={{ alignSelf: 'flex-start' }}>Add email connection</Button>}
          {addingEmail && <NewEmailConnection save={api.createAccount.mutateAsync} cancel={() => setAddingEmail(false)} />}
          {editingEmail && <NewEmailConnection account={editingEmail} save={(body) => api.updateAccount.mutateAsync({ accountId: editingEmail.id, body })} cancel={() => setEditingEmail(null)} />}
        </>}
        {section === 'people' && <><Heading title="People & permissions" description="Invite colleagues, change roles, or remove access from this workspace." /><Alert severity="info">Owners manage administrators and ownership. Administrators manage members and viewers.</Alert><Button variant="contained" onClick={() => void navigate({ to: '/organizations/$organizationId/members', params: { organizationId } })} sx={{ alignSelf: 'flex-start' }}>Open people management</Button></>}
        {section === 'activity' && <><Heading title="Workspace activity" description="The latest important administration changes inside this workspace." />{api.activity.isPending && <Loading />}{api.activity.isError && <Alert severity="error">The activity history could not be loaded.</Alert>}{api.activity.data?.length === 0 && <Typography color="text.secondary">No changes recorded yet.</Typography>}{api.activity.data?.map((event) => <Box key={event.id}><Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}><Box><Typography sx={{ fontWeight: 650 }}>{event.action}</Typography><Typography variant="body2" color="text.secondary">By {event.actor}{event.target ? ` · Affected: ${event.target}` : ''}</Typography></Box><Typography variant="body2" color="text.secondary">{new Date(event.created_at).toLocaleString()}</Typography></Stack><Divider sx={{ mt: 1.5 }} /></Box>)}</>}
        {section === 'danger' && <><Heading title="Export & danger zone" description="Download a portable copy before an irreversible workspace change." /><Box><Typography sx={{ fontWeight: 700 }}>Download workspace data</Typography><Typography color="text.secondary" sx={{ mb: 1.5 }}>Includes CRM records and non-secret settings. It is not a restorable database backup.</Typography><Button variant="outlined" onClick={() => void downloadExport()} disabled={api.downloadExport.isPending}>{api.downloadExport.isPending ? 'Preparing…' : 'Download JSON export'}</Button></Box><Divider />{workspace.is_personal ? <Alert severity="info">Personal workspaces cannot be deleted.</Alert> : <Box><Typography color="error" sx={{ fontWeight: 700 }}>Delete workspace permanently</Typography><Typography color="text.secondary" sx={{ my: 1.5 }}>This removes companies, contacts, automations, members, and settings. Download an export first.</Typography><TextField fullWidth label={`Type “${workspace.name}” to confirm`} value={confirmName} onChange={(event) => setConfirmName(event.target.value)} /><Button color="error" variant="contained" disabled={confirmName !== workspace.name || api.deleteOrganization.isPending} onClick={async () => { await api.deleteOrganization.mutateAsync(); await navigate({ to: '/' }) }} sx={{ mt: 2 }}>{api.deleteOrganization.isPending ? 'Deleting…' : 'Delete workspace'}</Button></Box>}</>}
      </Stack></Paper></Box>
    </Box>
  </Stack>
}
