import arrowRight from '@iconify-icons/keyline-icons/arrow-right'
import briefcase from '@iconify-icons/keyline-icons/briefcase'
import building from '@iconify-icons/keyline-icons/building'
import calendar from '@iconify-icons/keyline-icons/calendar'
import check from '@iconify-icons/keyline-icons/check'
import clock from '@iconify-icons/keyline-icons/clock'
import creditCard from '@iconify-icons/keyline-icons/credit-card'
import trendingUp from '@iconify-icons/keyline-icons/trending-up'
import users from '@iconify-icons/keyline-icons/users'
import { useMemo, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useNavigate, useParams } from '@tanstack/react-router'
import type { IconifyIcon } from '@iconify/react'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { OperationalTabs } from '../../components/common/OperationalTabs'
import { useActivityInbox } from '../../features/activity-inbox'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useCompleteTask } from '../../features/tasks'
import type { ActivityInboxItem, ActivityInboxKind } from '../../types/activityInbox.types'

type Source = 'all' | 'tasks' | 'sales' | 'customers' | 'billing' | 'team'
const sources: Source[] = ['all', 'tasks', 'sales', 'customers', 'billing', 'team']
const sourceByKind: Record<ActivityInboxKind, Exclude<Source, 'all'>> = {
  overdue_task: 'tasks',
  task_due_today: 'tasks',
  deal_without_next_action: 'sales',
  company_without_follow_up: 'customers',
  overdue_charges: 'billing',
  renewals_due: 'billing',
  pending_invitations: 'team',
}
const iconByKind: Record<ActivityInboxKind, IconifyIcon> = {
  overdue_task: clock,
  task_due_today: calendar,
  deal_without_next_action: trendingUp,
  company_without_follow_up: building,
  overdue_charges: creditCard,
  renewals_due: briefcase,
  pending_invitations: users,
}

export function InboxPage() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId/inbox' })
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const workspace = useWorkspace()
  const canManage = canCreateRecords(workspace)
  const inbox = useActivityInbox(organizationId)
  const completeTask = useCompleteTask(organizationId)
  const [source, setSource] = useState<Source>('all')
  const items = useMemo(
    () =>
      (inbox.data?.items ?? []).filter(
        (item) => source === 'all' || sourceByKind[item.kind] === source,
      ),
    [inbox.data, source],
  )
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.resolvedLanguage],
  )
  const dateOnlyFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }),
    [i18n.resolvedLanguage],
  )
  const filterOptions = sources.map((value) => ({ value, label: t(`inbox.sources.${value}`) }))

  function copyFor(item: ActivityInboxItem) {
    if (
      item.kind === 'overdue_charges' ||
      item.kind === 'renewals_due' ||
      item.kind === 'pending_invitations'
    ) {
      return {
        title: t(`inbox.kinds.${item.kind}`),
        description: t('inbox.itemsCount', { count: Number(item.description) }),
      }
    }
    if (item.kind === 'company_without_follow_up') {
      return { title: item.title, description: t('inbox.noOpenFollowUp') }
    }
    return { title: item.title, description: item.description }
  }

  function formatDueAt(value: string | null) {
    if (!value) {
      return t('inbox.needsReview')
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return dateOnlyFormatter.format(new Date(`${value}T00:00:00`))
    }
    return dateFormatter.format(new Date(value))
  }

  function openItem(item: ActivityInboxItem) {
    if (item.entity.type === 'company' && item.entity.id) {
      void navigate({
        to: '/organizations/$organizationId/companies/$companyId',
        params: { organizationId, companyId: item.entity.id },
      })
    } else if (item.entity.type === 'deal' && item.entity.id) {
      void navigate({
        to: '/organizations/$organizationId/deals/$dealId',
        params: { organizationId, dealId: item.entity.id },
      })
    } else if (item.entity.type === 'task') {
      void navigate({
        to: '/organizations/$organizationId/tasks',
        params: { organizationId },
        search: { owner: 'me', view: 'focus', q: item.title },
      })
    } else if (item.entity.type === 'members') {
      void navigate({ to: '/organizations/$organizationId/members', params: { organizationId } })
    } else if (item.kind === 'renewals_due') {
      void navigate({
        to: '/organizations/$organizationId/services/customer-services',
        params: { organizationId },
      })
    } else {
      void navigate({
        to: '/organizations/$organizationId/services/billing',
        params: { organizationId },
      })
    }
  }

  return (
    <Stack sx={{ gap: 3, maxWidth: 1120, mx: 'auto' }}>
      <Box>
        <Typography component="h1" variant="h3">
          {t('inbox.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          {t('inbox.description')}
        </Typography>
      </Box>
      {completeTask.isError ? <Alert severity="error">{completeTask.error.message}</Alert> : null}
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        <Typography
          component="label"
          htmlFor="inbox-source-filter"
          variant="body2"
          sx={{ display: 'block', mb: 0.75, fontWeight: 700 }}
        >
          {t('inbox.filters')}
        </Typography>
        <Box
          component="select"
          id="inbox-source-filter"
          value={source}
          onChange={(event) => setSource(event.target.value as Source)}
          sx={{
            width: '100%',
            minHeight: 44,
            px: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
            color: 'text.primary',
            font: 'inherit',
          }}
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Box>
      </Box>
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <OperationalTabs
          label={t('inbox.filters')}
          options={filterOptions}
          value={source}
          onChange={setSource}
        />
      </Box>
      {inbox.isPending ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress aria-label={t('common.loading')} />
        </Box>
      ) : null}
      {inbox.isError ? (
        <Stack
          role="alert"
          sx={{ alignItems: 'flex-start', gap: 1.5, py: 3, borderBlock: 1, borderColor: 'divider' }}
        >
          <Typography color="error">{t('inbox.error')}</Typography>
          <Button variant="outlined" onClick={() => void inbox.refetch()}>
            {t('inbox.retry')}
          </Button>
        </Stack>
      ) : null}
      {inbox.data === null ? (
        <Box sx={{ borderBlock: 1, borderColor: 'divider', py: 4 }}>
          <Typography variant="h5">{t('inbox.upgradeTitle')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {t('inbox.upgradeDescription')}
          </Typography>
        </Box>
      ) : null}
      {inbox.data && items.length === 0 ? (
        <Box sx={{ borderBlock: 1, borderColor: 'divider', py: 6 }}>
          <Typography variant="h5">{t('inbox.emptyTitle')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {t('inbox.emptyDescription')}
          </Typography>
        </Box>
      ) : null}
      {items.length > 0 ? (
        <Box
          component="ul"
          aria-label={t('inbox.listLabel')}
          sx={{ m: 0, p: 0, borderTop: 1, borderColor: 'divider' }}
        >
          {items.map((item) => {
            const copy = copyFor(item)
            return (
              <Box
                component="li"
                key={item.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '32px minmax(0, 1fr)',
                    md: '32px minmax(260px, 1.5fr) minmax(180px, .7fr) 220px',
                  },
                  columnGap: 1.5,
                  rowGap: 1.25,
                  alignItems: 'center',
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  listStyle: 'none',
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 32,
                    height: 32,
                    color:
                      item.severity === 'critical'
                        ? 'error.main'
                        : item.severity === 'warning'
                          ? 'warning.dark'
                          : 'text.secondary',
                  }}
                >
                  <AppIcon icon={iconByKind[item.kind]} size={20} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 750 }}>{copy.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {copy.description}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ gridColumn: { xs: '2', md: 'auto' } }}
                >
                  {formatDueAt(item.due_at)}
                </Typography>
                <Stack
                  direction="row"
                  sx={{
                    gridColumn: { xs: '1 / -1', md: 'auto' },
                    justifyContent: { xs: 'stretch', md: 'flex-end' },
                    gap: 1,
                  }}
                >
                  {canManage && item.entity.type === 'task' && item.entity.id ? (
                    <Button
                      sx={{ minHeight: 44 }}
                      startIcon={<AppIcon icon={check} />}
                      disabled={completeTask.isPending}
                      onClick={() => completeTask.mutate(item.entity.id!)}
                    >
                      {t('inbox.complete')}
                    </Button>
                  ) : null}
                  <Button
                    sx={{ minHeight: 44 }}
                    endIcon={<AppIcon icon={arrowRight} />}
                    onClick={() => openItem(item)}
                  >
                    {t('inbox.open')}
                  </Button>
                </Stack>
              </Box>
            )
          })}
        </Box>
      ) : null}
    </Stack>
  )
}
