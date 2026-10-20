import { Alert, Button, Snackbar } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { CompanyCommunicationDialog } from '../../features/companies/components/CompanyCommunicationDialog'
import { TaskDrawer } from '../../features/tasks/components/TaskDrawer'
import type { Company } from '../../types/company.types'
import type { CrmTask } from '../../types/task.types'

interface DashboardOverlaysProps {
  organizationId: string
  completedTask: CrmTask | null
  communicationTask: CrmTask | null
  snoozedTask: CrmTask | null
  communicationSaved: boolean
  attentionCommunicationCompany: Company | null
  nextActionCompany: Company | null
  isUndoPending: boolean
  hasCompleteError: boolean
  hasUndoError: boolean
  hasRescheduleError: boolean
  onUndoCompletion: () => void
  onDismissCompletedTask: () => void
  onDismissSnoozedTask: () => void
  onDismissCommunicationSaved: () => void
  onCloseCommunicationTask: () => void
  onSaveCommunicationTask: () => void
  onCloseAttentionCommunication: () => void
  onSaveAttentionCommunication: () => void
  onCloseNextAction: () => void
  onSaveNextAction: () => void
}

export function DashboardOverlays({
  organizationId,
  completedTask,
  communicationTask,
  snoozedTask,
  communicationSaved,
  attentionCommunicationCompany,
  nextActionCompany,
  isUndoPending,
  hasCompleteError,
  hasUndoError,
  hasRescheduleError,
  onUndoCompletion,
  onDismissCompletedTask,
  onDismissSnoozedTask,
  onDismissCommunicationSaved,
  onCloseCommunicationTask,
  onSaveCommunicationTask,
  onCloseAttentionCommunication,
  onSaveAttentionCommunication,
  onCloseNextAction,
  onSaveNextAction,
}: DashboardOverlaysProps) {
  const { t } = useTranslation()

  return (
    <>
      {hasCompleteError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('crm.dashboard.completeError')}
        </Alert>
      ) : null}
      <Snackbar
        open={Boolean(completedTask)}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') {
            onDismissCompletedTask()
          }
        }}
        message={t('crm.dashboard.taskCompleted', { title: completedTask?.title ?? '' })}
        action={
          <Button color="inherit" size="small" disabled={isUndoPending} onClick={onUndoCompletion}>
            {t('crm.dashboard.undo')}
          </Button>
        }
      />
      {hasUndoError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('crm.dashboard.undoError')}
        </Alert>
      ) : null}
      {hasRescheduleError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t('crm.dashboard.snoozeError')}
        </Alert>
      ) : null}
      <Snackbar
        open={Boolean(snoozedTask)}
        autoHideDuration={5000}
        onClose={onDismissSnoozedTask}
        message={t('crm.dashboard.snoozedUntilTomorrow', {
          title: snoozedTask?.title ?? '',
        })}
      />
      <Snackbar
        open={communicationSaved}
        autoHideDuration={5000}
        onClose={onDismissCommunicationSaved}
        message={t('crm.dashboard.communicationSaved')}
      />
      {communicationTask ? (
        <CompanyCommunicationDialog
          organizationId={organizationId}
          companyId={communicationTask.company}
          initialContactId={communicationTask.contact}
          initialKind={communicationTask.kind === 'task' ? undefined : communicationTask.kind}
          showFollowUpOption={false}
          onClose={onCloseCommunicationTask}
          onSaved={onSaveCommunicationTask}
        />
      ) : null}
      {attentionCommunicationCompany ? (
        <CompanyCommunicationDialog
          organizationId={organizationId}
          companyId={attentionCommunicationCompany.id}
          onClose={onCloseAttentionCommunication}
          onSaved={onSaveAttentionCommunication}
        />
      ) : null}
      {nextActionCompany ? (
        <TaskDrawer
          organizationId={organizationId}
          companies={[nextActionCompany]}
          initialCompanyId={nextActionCompany.id}
          onSaved={onSaveNextAction}
          onClose={onCloseNextAction}
        />
      ) : null}
    </>
  )
}
