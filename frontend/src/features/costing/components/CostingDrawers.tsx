import closeIcon from '@iconify-icons/keyline-icons/x'
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import type {
  Collaborator,
  CollaboratorInput,
  CollaboratorService,
  CollaboratorServiceInput,
} from '../../../types/costing.types'
import {
  useCreateCollaborator,
  useCreateCollaboratorService,
  useUpdateCollaborator,
  useUpdateCollaboratorService,
} from '../hooks/useCosting'

const drawerSx = {
  '& .MuiDrawer-paper': {
    width: { xs: '100%', sm: 580 },
    maxWidth: '100vw',
    bgcolor: 'background.default',
  },
}

function DrawerHeader({
  title,
  description,
  onClose,
}: {
  title: string
  description: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Stack
      direction="row"
      sx={{ p: 3, alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}
    >
      <Box>
        <Typography variant="h5">{title}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
      <IconButton aria-label={t('common.close')} onClick={onClose}>
        <AppIcon icon={closeIcon} />
      </IconButton>
    </Stack>
  )
}

export function CollaboratorDrawer({
  organizationId,
  collaborator,
  onClose,
}: {
  organizationId: string
  collaborator?: Collaborator
  onClose: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateCollaborator(organizationId)
  const update = useUpdateCollaborator(organizationId)
  const mutation = collaborator ? update : create
  const [form, setForm] = useState<CollaboratorInput>({
    name: collaborator?.name ?? '',
    specialty: collaborator?.specialty ?? '',
    email: collaborator?.email ?? '',
    phone_number: collaborator?.phone_number ?? '',
    notes: collaborator?.notes ?? '',
    is_active: collaborator?.is_active ?? true,
  })
  const save = () =>
    collaborator
      ? update.mutate({ id: collaborator.id, body: form }, { onSuccess: onClose })
      : create.mutate(form, { onSuccess: onClose })
  return (
    <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}>
      <DrawerHeader
        title={t(collaborator ? 'crm.costing.editCollaborator' : 'crm.costing.newCollaborator')}
        description={t('crm.costing.collaboratorFormHint')}
        onClose={onClose}
      />
      <Divider />
      <Stack spacing={2.25} sx={{ p: 3 }}>
        {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
        <TextField
          required
          autoFocus
          label={t('crm.costing.name')}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <TextField
          label={t('crm.costing.specialty')}
          value={form.specialty}
          onChange={(event) => setForm({ ...form, specialty: event.target.value })}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            type="email"
            fullWidth
            label={t('crm.costing.email')}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <TextField
            fullWidth
            label={t('crm.costing.phone')}
            value={form.phone_number}
            onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
          />
        </Stack>
        <TextField
          multiline
          minRows={3}
          label={t('crm.costing.notes')}
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
          }
          label={t('crm.costing.active')}
        />
        <Button
          variant="contained"
          size="large"
          disabled={!form.name.trim() || mutation.isPending}
          onClick={save}
        >
          {mutation.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </Stack>
    </Drawer>
  )
}

export function CollaboratorServiceDrawer({
  organizationId,
  collaborator,
  service,
  onClose,
}: {
  organizationId: string
  collaborator: Collaborator
  service?: CollaboratorService
  onClose: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateCollaboratorService(organizationId)
  const update = useUpdateCollaboratorService(organizationId)
  const mutation = service ? update : create
  const [form, setForm] = useState<CollaboratorServiceInput>({
    collaborator: collaborator.id,
    name: service?.name ?? '',
    default_cost: service?.default_cost ?? '0.00',
    currency: service?.currency ?? 'EUR',
    description: service?.description ?? '',
    is_active: service?.is_active ?? true,
  })
  const save = () =>
    service
      ? update.mutate({ id: service.id, body: form }, { onSuccess: onClose })
      : create.mutate(form, { onSuccess: onClose })
  return (
    <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}>
      <DrawerHeader
        title={t(service ? 'crm.costing.editService' : 'crm.costing.newService')}
        description={t('crm.costing.serviceFormHint', { name: collaborator.name })}
        onClose={onClose}
      />
      <Divider />
      <Stack spacing={2.25} sx={{ p: 3 }}>
        {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
        <TextField
          required
          autoFocus
          label={t('crm.costing.serviceName')}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            required
            fullWidth
            type="number"
            label={t('crm.costing.defaultCost')}
            value={form.default_cost}
            onChange={(event) => setForm({ ...form, default_cost: event.target.value })}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
          <TextField
            required
            sx={{ width: { sm: 140 } }}
            label={t('crm.costing.currency')}
            value={form.currency}
            onChange={(event) =>
              setForm({ ...form, currency: event.target.value.toUpperCase().slice(0, 3) })
            }
          />
        </Stack>
        <TextField
          multiline
          minRows={3}
          label={t('crm.costing.descriptionLabel')}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
          }
          label={t('crm.costing.active')}
        />
        <Button
          variant="contained"
          size="large"
          disabled={!form.name.trim() || Number(form.default_cost) < 0 || mutation.isPending}
          onClick={save}
        >
          {mutation.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </Stack>
    </Drawer>
  )
}
