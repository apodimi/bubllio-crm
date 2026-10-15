import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { Deal } from '../../../types/deal.types'
import type { DealActionsState } from '../dealBoardConfig'

interface DealActionsMenuProps {
  state: DealActionsState | null
  archivePending: boolean
  onClose: () => void
  onEdit: (deal: Deal) => void
  onToggleArchive: (deal: Deal) => void
  onDelete: (deal: Deal) => void
}

export function DealActionsMenu({
  state,
  archivePending,
  onClose,
  onEdit,
  onToggleArchive,
  onDelete,
}: DealActionsMenuProps) {
  const { t } = useTranslation()
  return (
    <Menu anchorEl={state?.anchor} open={Boolean(state)} onClose={onClose}>
      <MenuItem onClick={() => state && onEdit(state.deal)}>{t('crm.deals.edit')}</MenuItem>
      <MenuItem disabled={archivePending} onClick={() => state && onToggleArchive(state.deal)}>
        {state?.deal.archived_at ? t('crm.deals.restore') : t('crm.deals.archive')}
      </MenuItem>
      <MenuItem onClick={() => state && onDelete(state.deal)} sx={{ color: 'error.main' }}>
        {t('crm.deals.delete')}
      </MenuItem>
    </Menu>
  )
}

interface DeleteDealDialogProps {
  deal: Deal | null
  pending: boolean
  error: Error | null
  onClose: () => void
  onConfirm: (deal: Deal) => void
}

export function DeleteDealDialog({
  deal,
  pending,
  error,
  onClose,
  onConfirm,
}: DeleteDealDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={Boolean(deal)} onClose={pending ? undefined : onClose}>
      <DialogTitle>{t('crm.deals.deleteTitle')}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        ) : null}
        <Typography>{t('crm.deals.deleteDescription', { title: deal?.title ?? '' })}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={pending}>
          {t('common.cancel')}
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={pending || !deal}
          onClick={() => deal && onConfirm(deal)}
        >
          {pending ? t('crm.deals.deleting') : t('crm.deals.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
