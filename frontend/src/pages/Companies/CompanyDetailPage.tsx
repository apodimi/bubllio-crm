import { useState } from 'react'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined'
import RestoreRounded from '@mui/icons-material/RestoreRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded'
import PhoneOutlined from '@mui/icons-material/PhoneOutlined'
import {
  Box,
  Button,
  Chip,
  Divider,
  Link as MuiLink,
  Paper,
  Alert,
  Stack,
  Typography,
} from '@mui/material'
import { Link, useParams } from '@tanstack/react-router'
import { Failure, Loading } from '../../components/common/Feedback'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import {
  useArchiveCompany,
  useCompany,
  useCompanyActivity,
  useRestoreCompany,
} from '../../features/companies'
import { CompanyDialog } from '../../features/companies/components/CompanyDialog'
import { CompanyProfileContent } from '../../features/companies/components/CompanyProfileContent'
import { useContacts } from '../../features/contacts'
import { useSubscriptions } from '../../features/subscriptions'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

export function CompanyDetailPage() {
  const organization = useWorkspace()
  const { companyId } = useParams({
    from: '/organizations/$organizationId/companies/$companyId',
  })
  const company = useCompany(organization.id, companyId)
  const contacts = useContacts(organization.id, { company: company.data?.id ?? '' })
  const activity = useCompanyActivity(organization.id, companyId)
  const subscriptions = useSubscriptions(organization.id)
  const archive = useArchiveCompany(organization.id)
  const restore = useRestoreCompany(organization.id)
  const [editing, setEditing] = useState(false)

  if (company.isPending) return <Loading />
  if (company.isError) return <Failure error={company.error} retry={() => void company.refetch()} />

  const companyContacts = contacts.data ?? []
  const canManage = canCreateRecords(organization)
  const companySubscriptions = (subscriptions.data ?? []).filter(
    (subscription) => subscription.company === company.data.id,
  )

  return (
    <>
      <Link
        to="/organizations/$organizationId/companies"
        params={{ organizationId: organization.id }}
        search={{ company: undefined }}
      >
        <Button component="span" startIcon={<ArrowBackRounded />} sx={{ mb: 2 }}>
          Back to companies
        </Button>
      </Link>
      {company.data.archived_at ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          This company is archived. Its profile and history remain available.
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{
          mb: 4,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <Chip
              size="small"
              label={company.data.lifecycle_stage}
              color="primary"
              variant="outlined"
            />
            {company.data.industry ? (
              <Typography variant="body2" color="text.secondary">
                {company.data.industry}
              </Typography>
            ) : null}
          </Stack>
          <Typography variant="h3">{company.data.name}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Client since {formatDate(company.data.created_at)} · Updated{' '}
            {formatDate(company.data.updated_at)}
          </Typography>
        </Box>
        {canManage ? (
          <Stack direction="row" spacing={1.25}>
            <Button
              variant="contained"
              startIcon={<EditRounded />}
              onClick={() => setEditing(true)}
            >
              Edit company
            </Button>
            <Button
              variant="outlined"
              startIcon={company.data.archived_at ? <RestoreRounded /> : <ArchiveOutlined />}
              disabled={archive.isPending || restore.isPending}
              onClick={() =>
                company.data.archived_at ? restore.mutate(companyId) : archive.mutate(companyId)
              }
            >
              {company.data.archived_at ? 'Restore' : 'Archive'}
            </Button>
          </Stack>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(320px, .65fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Company profile
          </Typography>
          <CompanyProfileContent company={company.data} />
        </Paper>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="h6">Contacts</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              People connected to this company
            </Typography>
          </Box>
          <Divider />
          {contacts.isPending ? (
            <Box sx={{ p: 3 }}>
              <Loading />
            </Box>
          ) : contacts.isError ? (
            <Box sx={{ p: 3 }}>
              <Failure error={contacts.error} retry={() => void contacts.refetch()} />
            </Box>
          ) : companyContacts.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No contacts have been connected to this company yet.
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {companyContacts.map((contact) => (
                <Box key={contact.id} sx={{ px: 3, py: 2.25 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[contact.job_title, contact.department].filter(Boolean).join(' · ') ||
                      'Contact'}
                  </Typography>
                  <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                    {contact.email ? (
                      <MuiLink href={`mailto:${contact.email}`} variant="body2" underline="hover">
                        <MailOutlineRounded
                          sx={{ fontSize: 16, mr: 0.75, verticalAlign: 'text-bottom' }}
                        />
                        {contact.email}
                      </MuiLink>
                    ) : null}
                    {contact.phone_number ? (
                      <MuiLink
                        href={`tel:${contact.phone_number}`}
                        variant="body2"
                        underline="hover"
                      >
                        <PhoneOutlined
                          sx={{ fontSize: 16, mr: 0.75, verticalAlign: 'text-bottom' }}
                        />
                        {contact.phone_number}
                      </MuiLink>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
        <Paper variant="outlined" sx={{ overflow: 'hidden', gridColumn: { lg: '1 / -1' } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              px: 3,
              py: 2.5,
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h6">Services & billing</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Customer subscriptions, renewal dates, and agreed amounts
              </Typography>
            </Box>
            <Link
              to="/organizations/$organizationId/services"
              params={{ organizationId: organization.id }}
            >
              <Button component="span">Open billing</Button>
            </Link>
          </Stack>
          <Divider />
          {subscriptions.isPending ? (
            <Loading />
          ) : subscriptions.isError ? (
            <Box sx={{ p: 3 }}>
              <Failure error={subscriptions.error} retry={() => void subscriptions.refetch()} />
            </Box>
          ) : companySubscriptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
              No services are connected to this company yet.
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {companySubscriptions.map((subscription) => (
                <Stack
                  key={subscription.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ px: 3, py: 2.25, justifyContent: 'space-between', gap: 1 }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{subscription.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {subscription.effective_status === 'cancelling' &&
                      subscription.cancellation_effective_date
                        ? `Active through ${formatDate(subscription.cancellation_effective_date)}`
                        : `Next charge ${formatDate(subscription.next_billing_date)}`}{' '}
                      · {subscription.billing_interval.replace('_', ' ')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip
                      size="small"
                      label={
                        subscription.effective_status === 'cancelling'
                          ? 'ending'
                          : subscription.effective_status
                      }
                      color={
                        subscription.effective_status === 'active'
                          ? 'success'
                          : subscription.effective_status === 'cancelling'
                            ? 'warning'
                            : 'default'
                      }
                    />
                    <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {Number(subscription.gross_price).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{' '}
                      {subscription.currency}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, gridColumn: { lg: '1 / -1' } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
            <HistoryRounded color="primary" />
            <Typography variant="h6">Activity</Typography>
          </Stack>
          {activity.isPending ? (
            <Loading />
          ) : activity.isError ? (
            <Failure error={activity.error} retry={() => void activity.refetch()} />
          ) : activity.data.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No activity recorded yet.
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {activity.data.map((item) => (
                <Stack
                  key={item.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 0.5, sm: 2 }}
                  sx={{ py: 1.75, justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.action === 'contact_added'
                        ? `Added contact ${item.details.contact_name ?? ''}`
                        : item.action === 'assigned'
                          ? 'Changed account owner'
                          : `${item.action[0].toUpperCase()}${item.action.slice(1)} company`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {item.actor_name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(item.created_at)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      {editing ? (
        <CompanyDialog
          organizationId={organization.id}
          company={company.data}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  )
}
