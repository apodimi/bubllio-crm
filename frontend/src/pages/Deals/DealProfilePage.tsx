import archiveIcon from '@iconify-icons/keyline-icons/archive'
import arrowLeftIcon from '@iconify-icons/keyline-icons/arrow-left'
import calendarIcon from '@iconify-icons/keyline-icons/calendar'
import checkIcon from '@iconify-icons/keyline-icons/check'
import plusIcon from '@iconify-icons/keyline-icons/plus'
import undoIcon from '@iconify-icons/keyline-icons/undo'
import { Alert, Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { DescriptionItem } from '../../components/common/DescriptionItem'
import { Failure, Loading } from '../../components/common/Feedback'
import { RecordMetricStrip } from '../../components/common/RecordMetricStrip'
import { useCompanies } from '../../features/companies'
import { useArchiveDeal, useDeal } from '../../features/deals'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import { useCompleteTask, useTasks } from '../../features/tasks'
import { TaskDrawer } from '../../features/tasks/components/TaskDrawer'
import type { CrmTask } from '../../types/task.types'

import { DealDrawer } from './DealDrawer'

export function DealProfilePage() {
  const { t, i18n } = useTranslation()
  const workspace = useWorkspace()
  const { dealId } = useParams({ from: '/organizations/$organizationId/deals/$dealId' })
  const routeSearch = useSearch({ from: '/organizations/$organizationId/deals/$dealId' })
  const deal = useDeal(workspace.id, dealId)
  const tasks = useTasks(workspace.id, { deal: dealId, bucket: 'all' })
  const archive = useArchiveDeal(workspace.id)
  const complete = useCompleteTask(workspace.id)
  const canManage = canCreateRecords(workspace)
  const [editingDeal, setEditingDeal] = useState(false)
  const [editingTask, setEditingTask] = useState<CrmTask | null | undefined>(undefined)
  const drawerOpen = editingDeal || editingTask !== undefined
  const companies = useCompanies(workspace.id, { archived: 'all' }, drawerOpen)
  const locale = i18n.resolvedLanguage ?? i18n.language
  const date = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }), [locale])
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  )

  if (deal.isPending) {
    return <Loading />
  }
  if (deal.isError) {
    return <Failure error={deal.error} retry={() => void deal.refetch()} />
  }

  const record = deal.data
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: record.currency })
  const weightedNet = Number(record.net_value) * (record.probability / 100)
  const dealTasks = [...(tasks.data ?? [])].sort((left, right) => {
    if (Boolean(left.completed_at) !== Boolean(right.completed_at)) {
      return left.completed_at ? 1 : -1
    }
    return new Date(left.due_at).getTime() - new Date(right.due_at).getTime()
  })
  const empty = t('crm.deals.profile.emptyValue')

  return (
    <>
      <Link
        to="/organizations/$organizationId/deals"
        params={{ organizationId: workspace.id }}
        search={{ q: routeSearch.q, view: routeSearch.view, stage: routeSearch.stage }}
      >
        <Button component="span" startIcon={<AppIcon icon={arrowLeftIcon} />} sx={{ mb: 2 }}>
          {t('crm.deals.profile.back')}
        </Button>
      </Link>

      {record.archived_at ? (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          {t('crm.deals.profile.archivedNotice')}
        </Alert>
      ) : null}
      {complete.isError ? <Alert severity="error">{complete.error.message}</Alert> : null}
      {!canManage ? (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          {t('crm.deals.profile.readOnly')}
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'flex-start' } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Chip size="small" label={t(`crm.deals.stageLabels.${record.stage}`)} color="primary" />
            {record.archived_at ? (
              <Chip size="small" label={t('crm.deals.archivedSingle')} variant="outlined" />
            ) : null}
          </Stack>
          <Typography component="h1" variant="h3" sx={{ mt: 1, overflowWrap: 'anywhere' }}>
            {record.title}
          </Typography>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ mt: 1.25, flexWrap: 'wrap' }}>
            <Link
              to="/organizations/$organizationId/companies/$companyId"
              params={{ organizationId: workspace.id, companyId: record.company }}
            >
              {record.company_name}
            </Link>
            <Typography variant="body2" color="text.secondary">
              {record.contact_name || t('crm.deals.drawer.noContact')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {record.assigned_to_name || t('crm.deals.drawer.unassigned')}
            </Typography>
          </Stack>
        </Box>
        {canManage ? (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => setEditingDeal(true)}>
              {t('crm.deals.edit')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AppIcon icon={record.archived_at ? undoIcon : archiveIcon} />}
              disabled={archive.isPending}
              onClick={() => archive.mutate(record.id)}
            >
              {record.archived_at ? t('crm.deals.restore') : t('crm.deals.archive')}
            </Button>
          </Stack>
        ) : null}
      </Stack>

      {archive.isError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {archive.error.message}
        </Alert>
      ) : null}
      {drawerOpen && companies.isPending ? (
        <Box sx={{ mt: 2 }}>
          <Loading />
        </Box>
      ) : null}
      {drawerOpen && companies.isError ? (
        <Box sx={{ mt: 2 }}>
          <Failure error={companies.error} retry={() => void companies.refetch()} />
        </Box>
      ) : null}

      <Box sx={{ mt: 3 }}>
        <RecordMetricStrip
          items={[
            {
              key: 'net',
              label: t('crm.deals.profile.net'),
              value: money.format(Number(record.net_value)),
            },
            {
              key: 'probability',
              label: t('crm.deals.profile.probability'),
              value: `${record.probability}%`,
            },
            {
              key: 'weighted-net',
              label: t('crm.deals.profile.weightedNet'),
              value: money.format(weightedNet),
            },
            {
              key: 'expected-close',
              label: t('crm.deals.profile.expectedClose'),
              value: record.expected_close_date
                ? date.format(new Date(`${record.expected_close_date}T00:00:00`))
                : empty,
            },
          ]}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.8fr) minmax(300px, 1fr)' },
          gap: 3,
          mt: 3,
          alignItems: 'start',
        }}
      >
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack
              direction="row"
              spacing={2}
              sx={{ px: 3, py: 2.5, alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography component="h2" variant="h6">
                  {t('crm.deals.profile.nextActions')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('crm.deals.profile.nextActionsDescription')}
                </Typography>
              </Box>
              {canManage ? (
                <Button
                  startIcon={<AppIcon icon={plusIcon} />}
                  onClick={() => setEditingTask(null)}
                >
                  {t('crm.deals.addNextAction')}
                </Button>
              ) : null}
            </Stack>
            <Divider />
            {tasks.isPending ? (
              <Box sx={{ p: 3 }}>
                <Loading />
              </Box>
            ) : tasks.isError ? (
              <Box sx={{ p: 3 }}>
                <Failure error={tasks.error} retry={() => void tasks.refetch()} />
              </Box>
            ) : dealTasks.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography color="text.secondary">{t('crm.deals.profile.noActions')}</Typography>
              </Box>
            ) : (
              <Stack divider={<Divider />}>
                {dealTasks.map((task) => (
                  <Box
                    key={task.id}
                    sx={{
                      px: 3,
                      py: 2,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
                      gap: 1.5,
                      alignItems: 'center',
                      opacity: task.completed_at ? 0.62 : 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 750 }}>{task.title}</Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, alignItems: 'center' }}>
                        <AppIcon icon={calendarIcon} size={16} />
                        <Typography variant="body2" color="text.secondary">
                          {dateTime.format(new Date(task.due_at))}
                        </Typography>
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {canManage && !task.completed_at ? (
                        <Button
                          size="small"
                          startIcon={<AppIcon icon={checkIcon} />}
                          disabled={complete.isPending}
                          onClick={() => complete.mutate(task.id)}
                        >
                          {t('crm.tasks.completeTask', { title: task.title })}
                        </Button>
                      ) : null}
                      {canManage ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setEditingTask(task)}
                        >
                          {t('common.edit')}
                        </Button>
                      ) : null}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography component="h2" variant="h6">
              {t('crm.deals.profile.notes')}
            </Typography>
            <Typography
              sx={{ mt: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              color={record.notes ? 'text.primary' : 'text.secondary'}
            >
              {record.notes || t('crm.deals.profile.noNotes')}
            </Typography>
          </Paper>
        </Stack>

        <Paper variant="outlined" sx={{ px: 3, py: 1 }}>
          <Typography component="h2" variant="h6" sx={{ py: 1.5 }}>
            {t('crm.deals.profile.details')}
          </Typography>
          <Divider />
          <DescriptionItem
            label={t('crm.deals.profile.tax')}
            value={money.format(Number(record.tax_value))}
            emphasized
            paddingY={1.5}
          />
          <Divider />
          <DescriptionItem
            label={t('crm.deals.profile.gross')}
            value={money.format(Number(record.gross_value))}
            emphasized
            paddingY={1.5}
          />
          <Divider />
          <DescriptionItem
            label={t('crm.deals.profile.basis')}
            value={t(
              record.amount_includes_tax
                ? 'crm.deals.profile.grossBasis'
                : 'crm.deals.profile.netBasis',
            )}
            emphasized
            paddingY={1.5}
          />
          <Divider />
          <DescriptionItem
            label={t('crm.deals.profile.lostReason')}
            value={record.lost_reason || empty}
            emphasized
            paddingY={1.5}
          />
          <Divider />
          <DescriptionItem
            label={t('crm.deals.profile.created')}
            value={dateTime.format(new Date(record.created_at))}
            emphasized
            paddingY={1.5}
          />
          <Divider />
          <DescriptionItem
            label={t('crm.deals.profile.updated')}
            value={dateTime.format(new Date(record.updated_at))}
            emphasized
            paddingY={1.5}
          />
        </Paper>
      </Box>

      {editingDeal && companies.data ? (
        <DealDrawer
          organizationId={workspace.id}
          companies={companies.data}
          deal={record}
          onClose={() => setEditingDeal(false)}
        />
      ) : null}
      {editingTask !== undefined && companies.data ? (
        <TaskDrawer
          organizationId={workspace.id}
          companies={companies.data}
          task={editingTask ?? undefined}
          initialCompanyId={record.company}
          initialContactId={record.contact ?? undefined}
          initialDealId={record.id}
          initialDealTitle={record.title}
          onClose={() => setEditingTask(undefined)}
        />
      ) : null}
    </>
  )
}
