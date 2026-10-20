import fileTextIcon from '@iconify-icons/keyline-icons/file-text'
import listCheckIcon from '@iconify-icons/keyline-icons/list-check'
import phoneIcon from '@iconify-icons/keyline-icons/phone'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import { Failure } from '../../../components/common/Feedback'
import type { Company, CompanyTimelineCategory } from '../../../types/company.types'
import { TaskDrawer } from '../../tasks/components/TaskDrawer'
import { useCompanyTimeline } from '../hooks/useCompanies'

import { CompanyCommunicationDialog } from './CompanyCommunicationDialog'
import { CompanyNoteComposer } from './CompanyNoteComposer'
import { CompanyTimelineEventList } from './CompanyTimelineEventList'
import { CompanyTimelineFilters } from './CompanyTimelineFilters'
import { groupTimelineEvents } from './CompanyTimelineFormatters'
import { CompanyTimelineLoading } from './CompanyTimelineLoading'

export function CompanyTimeline({
  organizationId,
  company,
  canManage,
}: {
  organizationId: string
  company: Company
  canManage: boolean
}) {
  const { t, i18n } = useTranslation()
  const [category, setCategory] = useState<CompanyTimelineCategory>()
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [communicationOpen, setCommunicationOpen] = useState(false)
  const [followUpContactId, setFollowUpContactId] = useState<string>()
  const [noteAdded, setNoteAdded] = useState(false)
  const timeline = useCompanyTimeline(organizationId, company.id, category)
  const events = timeline.data?.pages.flatMap((page) => page.results) ?? []
  const locale = i18n.resolvedLanguage ?? i18n.language
  const groupedEvents = groupTimelineEvents(events, locale, t)

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={t('crm.companies.timeline.title')}
      aria-busy={timeline.isPending || timeline.isFetchingNextPage}
      sx={{ overflow: 'hidden', minWidth: 0 }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2.5,
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography component="h2" variant="h6">
            {t('crm.companies.timeline.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.companies.timeline.description')}
          </Typography>
        </Box>
        <CompanyTimelineFilters category={category} onChange={setCategory} t={t} />
      </Stack>

      {canManage ? (
        <Box sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Stack
            direction="row"
            useFlexGap
            sx={{ px: { xs: 2, sm: 3 }, py: 1.5, flexWrap: 'wrap', gap: 1 }}
          >
            <Button
              variant={noteComposerOpen ? 'contained' : 'text'}
              startIcon={<AppIcon icon={fileTextIcon} />}
              onClick={() => {
                setNoteAdded(false)
                setNoteComposerOpen(true)
              }}
              sx={{ minHeight: 44 }}
            >
              {t('crm.companies.timeline.addNote')}
            </Button>
            <Button
              startIcon={<AppIcon icon={phoneIcon} />}
              onClick={() => setCommunicationOpen(true)}
              sx={{ minHeight: 44 }}
            >
              {t('crm.companies.timeline.logCommunication')}
            </Button>
            <Button
              startIcon={<AppIcon icon={listCheckIcon} />}
              onClick={() => {
                setFollowUpContactId(undefined)
                setTaskDrawerOpen(true)
              }}
              sx={{ minHeight: 44 }}
            >
              {t('crm.companies.timeline.addNextAction')}
            </Button>
          </Stack>
          {noteComposerOpen ? (
            <Box sx={{ borderTop: 1, borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 2 }}>
              <CompanyNoteComposer
                organizationId={organizationId}
                companyId={company.id}
                onCancel={() => setNoteComposerOpen(false)}
                onSuccess={() => {
                  setNoteAdded(true)
                  setNoteComposerOpen(false)
                }}
              />
            </Box>
          ) : null}
        </Box>
      ) : null}

      <Box aria-live="polite" sx={{ px: { xs: 2, sm: 3 }, pt: noteAdded ? 2 : 0 }}>
        {noteAdded ? (
          <Alert severity="success">{t('crm.companies.timeline.noteSuccess')}</Alert>
        ) : null}
      </Box>
      {timeline.isPending ? <CompanyTimelineLoading /> : null}
      {timeline.isError ? (
        <Box sx={{ p: 3 }}>
          <Failure error={timeline.error} retry={() => void timeline.refetch()} />
        </Box>
      ) : null}
      {timeline.isSuccess && events.length === 0 ? (
        <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>{t('crm.companies.timeline.emptyTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {category
              ? t('crm.companies.timeline.emptyFiltered')
              : t('crm.companies.timeline.emptyDescription')}
          </Typography>
          {category ? (
            <Button onClick={() => setCategory(undefined)} sx={{ mt: 1.5 }}>
              {t('crm.companies.timeline.clearFilter')}
            </Button>
          ) : null}
        </Box>
      ) : null}
      {timeline.isSuccess && events.length > 0 ? (
        <CompanyTimelineEventList groups={groupedEvents} locale={locale} t={t} />
      ) : null}
      {timeline.isSuccess && events.length > 0 && timeline.hasNextPage ? (
        <Box sx={{ px: 3, py: 2, textAlign: 'center' }}>
          <Button
            onClick={() => void timeline.fetchNextPage()}
            disabled={timeline.isFetchingNextPage}
          >
            {timeline.isFetchingNextPage
              ? t('common.loading')
              : t('crm.companies.timeline.loadEarlier')}
          </Button>
        </Box>
      ) : null}

      {taskDrawerOpen ? (
        <TaskDrawer
          organizationId={organizationId}
          companies={[company]}
          initialCompanyId={company.id}
          initialContactId={followUpContactId}
          onSaved={() => void timeline.refetch()}
          onClose={() => setTaskDrawerOpen(false)}
        />
      ) : null}
      {communicationOpen ? (
        <CompanyCommunicationDialog
          organizationId={organizationId}
          companyId={company.id}
          onClose={() => setCommunicationOpen(false)}
          onSaved={(addFollowUp, contactId) => {
            setCommunicationOpen(false)
            if (addFollowUp) {
              setFollowUpContactId(contactId ?? undefined)
              setTaskDrawerOpen(true)
            }
          }}
        />
      ) : null}
    </Paper>
  )
}
