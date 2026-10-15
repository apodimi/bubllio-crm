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

import type { Contact } from '../../../types/contact.types'
import type { ContactActionsState } from '../contactListConfig'

interface ContactActionsMenuProps {
  state: ContactActionsState | null
  archivePending: boolean
  onClose: () => void
  onEdit: (contact: Contact) => void
  onArchive: (contact: Contact) => void
  onRestore: (contact: Contact) => void
  onDelete: (contact: Contact) => void
}

export function ContactActionsMenu({
  state,
  archivePending,
  onClose,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: ContactActionsMenuProps) {
  const { t } = useTranslation()
  return (
    <Menu anchorEl={state?.anchor} open={Boolean(state)} onClose={onClose}>
      <MenuItem onClick={() => state && onEdit(state.contact)}>{t('crm.contacts.edit')}</MenuItem>
      <MenuItem
        disabled={archivePending}
        onClick={() => {
          if (!state) return
          if (state.contact.archived_at) onRestore(state.contact)
          else onArchive(state.contact)
        }}
      >
        {state?.contact.archived_at ? t('crm.contacts.restore') : t('crm.contacts.archive')}
      </MenuItem>
      <MenuItem onClick={() => state && onDelete(state.contact)} sx={{ color: 'error.main' }}>
        {t('crm.contacts.delete')}
      </MenuItem>
    </Menu>
  )
}

interface DeleteContactDialogProps {
  contact: Contact | null
  pending: boolean
  error: Error | null
  onClose: () => void
  onConfirm: (contact: Contact) => void
}

export function DeleteContactDialog({
  contact,
  pending,
  error,
  onClose,
  onConfirm,
}: DeleteContactDialogProps) {
  const { t } = useTranslation()
  const name = contact ? `${contact.first_name} ${contact.last_name}`.trim() : ''
  return (
    <Dialog open={Boolean(contact)} onClose={pending ? undefined : onClose}>
      <DialogTitle>{t('crm.contacts.deleteTitle')}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        ) : null}
        <Typography>{t('crm.contacts.deleteDescription', { name })}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={pending}>
          {t('common.cancel')}
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={pending || !contact}
          onClick={() => contact && onConfirm(contact)}
        >
          {pending ? t('crm.contacts.deleting') : t('crm.contacts.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
