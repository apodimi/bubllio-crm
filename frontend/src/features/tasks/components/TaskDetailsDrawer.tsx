import CloseRounded from '@mui/icons-material/CloseRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import { Box, Button, Drawer, IconButton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { CrmTask } from '../../../types/task.types'

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Box component="div" sx={{ minWidth: 0 }}>
      <Typography component="dt" variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

export function TaskDetailsDrawer({
  task,
  canManage,
  onEdit,
  onClose,
}: {
  task: CrmTask
  canManage: boolean
  onEdit: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const dateTime = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(language, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value))
      : '—'

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 560 },
          maxWidth: '100vw',
          bgcolor: 'background.default',
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          py: 2.5,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {t(`crm.tasks.kind.${task.kind}`)} · {t(`crm.tasks.status.${task.workflow_status}`)}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
              {task.title}
            </Typography>
          </Box>
          <IconButton aria-label={t('crm.tasks.details.close')} onClick={onClose}>
            <CloseRounded />
          </IconButton>
        </Stack>
        {canManage ? (
          <Button variant="contained" startIcon={<EditRounded />} onClick={onEdit} sx={{ mt: 2.5 }}>
            {t('crm.tasks.details.edit')}
          </Button>
        ) : null}
      </Box>

      <Stack
        component="dl"
        spacing={3}
        sx={{ m: 0, px: { xs: 2.5, sm: 4 }, py: 4, overflowY: 'auto' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <DetailField label={t('crm.tasks.details.company')} value={task.company_name} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <DetailField
              label={t('crm.tasks.details.owner')}
              value={task.assigned_to_name || t('crm.tasks.unassigned')}
            />
          </Box>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <DetailField label={t('crm.tasks.details.contact')} value={task.contact_name || '—'} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <DetailField label={t('crm.tasks.details.deal')} value={task.deal_title || '—'} />
          </Box>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <DetailField label={t('crm.tasks.details.due')} value={dateTime(task.due_at)} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <DetailField
              label={t('crm.tasks.details.reminder')}
              value={dateTime(task.reminder_at)}
            />
          </Box>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <DetailField
              label={t('crm.tasks.details.priority')}
              value={t(`crm.tasks.priority.${task.priority}`)}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <DetailField
              label={t('crm.tasks.details.status')}
              value={t(`crm.tasks.status.${task.workflow_status}`)}
            />
          </Box>
        </Stack>
        <DetailField label={t('crm.tasks.details.createdBy')} value={task.created_by_name || '—'} />
        <Box component="div">
          <Typography component="dt" variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('crm.tasks.details.notes')}
          </Typography>
          <Typography component="dd" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {task.notes || t('crm.tasks.details.noNotes')}
          </Typography>
        </Box>
      </Stack>
    </Drawer>
  )
}
