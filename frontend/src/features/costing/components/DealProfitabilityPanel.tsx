import deleteIcon from '@iconify-icons/keyline-icons/delete'
import chevronDownIcon from '@iconify-icons/keyline-icons/chevron-down'
import editIcon from '@iconify-icons/keyline-icons/pen'
import plusIcon from '@iconify-icons/keyline-icons/plus'
import closeIcon from '@iconify-icons/keyline-icons/x'
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import { Empty, Failure, Loading } from '../../../components/common/Feedback'
import { RecordMetricStrip } from '../../../components/common/RecordMetricStrip'
import type { DealCost, DealCostInput, DealCostStatus } from '../../../types/costing.types'
import {
  useCollaborators,
  useCollaboratorServices,
  useCreateDealCost,
  useDealCosts,
  useDealProfitability,
  useDeleteDealCost,
  useUpdateDealCost,
} from '../hooks/useCosting'

const drawerSx = {
  '& .MuiDrawer-paper': {
    width: { xs: '100%', sm: 580 },
    maxWidth: '100vw',
    bgcolor: 'background.default',
  },
}

function DealCostDrawer({
  organizationId,
  dealId,
  currency,
  cost,
  onClose,
}: {
  organizationId: string
  dealId: string
  currency: string
  cost?: DealCost
  onClose: () => void
}) {
  const { t } = useTranslation()
  const collaborators = useCollaborators(organizationId)
  const [collaboratorId, setCollaboratorId] = useState(cost?.collaborator ?? '')
  const services = useCollaboratorServices(organizationId, collaboratorId, Boolean(collaboratorId))
  const create = useCreateDealCost(organizationId, dealId)
  const update = useUpdateDealCost(organizationId, dealId)
  const mutation = cost ? update : create
  const [form, setForm] = useState<DealCostInput>({
    collaborator: cost?.collaborator ?? '',
    collaborator_service: cost?.collaborator_service ?? null,
    service_name: cost?.service_name ?? '',
    description: cost?.description ?? '',
    quantity: cost?.quantity ?? '1',
    unit_cost: cost?.unit_cost ?? '0.00',
    currency: cost?.currency ?? currency,
    status: cost?.status ?? 'estimated',
  })
  const selectCollaborator = (id: string) => {
    setCollaboratorId(id)
    setForm({
      ...form,
      collaborator: id,
      collaborator_service: null,
      service_name: '',
      unit_cost: '0.00',
      currency,
    })
  }
  const selectService = (id: string) => {
    const selected = services.data?.find((item) => item.id === id)
    setForm({
      ...form,
      collaborator_service: id || null,
      service_name: selected?.name ?? form.service_name,
      description: selected?.description ?? form.description,
      unit_cost: selected?.default_cost ?? form.unit_cost,
      currency: selected?.currency ?? currency,
    })
  }
  const valid =
    form.collaborator &&
    form.service_name.trim() &&
    Number(form.quantity) > 0 &&
    Number(form.unit_cost) >= 0 &&
    form.currency === currency
  const save = () =>
    cost
      ? update.mutate({ id: cost.id, body: form }, { onSuccess: onClose })
      : create.mutate(form, { onSuccess: onClose })
  return (
    <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={drawerSx}>
      <Stack
        direction="row"
        sx={{ p: 3, justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}
      >
        <Box>
          <Typography variant="h5">
            {t(cost ? 'crm.costing.editDealCost' : 'crm.costing.addDealCost')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.costing.dealCostHint')}
          </Typography>
        </Box>
        <IconButton aria-label={t('common.close')} onClick={onClose}>
          <AppIcon icon={closeIcon} />
        </IconButton>
      </Stack>
      <Divider />
      <Stack spacing={2.25} sx={{ p: 3 }}>
        {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
        <TextField
          select
          required
          autoFocus
          label={t('crm.costing.collaborator')}
          value={form.collaborator}
          onChange={(event) => selectCollaborator(event.target.value)}
        >
          {(collaborators.data ?? [])
            .filter((item) => item.is_active || item.id === cost?.collaborator)
            .map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
        </TextField>
        <TextField
          select
          disabled={!form.collaborator || services.isPending}
          label={t('crm.costing.catalogService')}
          value={form.collaborator_service ?? ''}
          onChange={(event) => selectService(event.target.value)}
        >
          <MenuItem value="">{t('crm.costing.customCost')}</MenuItem>
          {(services.data ?? [])
            .filter((item) => item.is_active || item.id === cost?.collaborator_service)
            .map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
        </TextField>
        {services.isError ? (
          <Failure error={services.error} retry={() => void services.refetch()} />
        ) : null}
        <TextField
          required
          label={t('crm.costing.costName')}
          value={form.service_name}
          onChange={(event) => setForm({ ...form, service_name: event.target.value })}
        />
        <TextField
          multiline
          minRows={2}
          label={t('crm.costing.descriptionLabel')}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            required
            fullWidth
            type="number"
            label={t('crm.costing.quantity')}
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
          />
          <TextField
            required
            fullWidth
            type="number"
            label={t('crm.costing.unitCost')}
            value={form.unit_cost}
            onChange={(event) => setForm({ ...form, unit_cost: event.target.value })}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
          <TextField
            disabled
            label={t('crm.costing.currency')}
            value={form.currency}
            sx={{ width: { sm: 120 } }}
          />
        </Stack>
        {form.currency !== currency ? (
          <Alert severity="warning">{t('crm.costing.currencyMismatch', { currency })}</Alert>
        ) : null}
        <TextField
          select
          label={t('crm.costing.status')}
          value={form.status}
          onChange={(event) => setForm({ ...form, status: event.target.value as DealCostStatus })}
        >
          {(['estimated', 'committed', 'paid', 'cancelled'] as DealCostStatus[]).map((status) => (
            <MenuItem key={status} value={status}>
              {t(`crm.costing.statuses.${status}`)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          size="large"
          disabled={!valid || mutation.isPending || collaborators.isPending}
          onClick={save}
        >
          {mutation.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </Stack>
    </Drawer>
  )
}

export function DealProfitabilityPanel({
  organizationId,
  dealId,
  currency,
  canManage,
  archived,
}: {
  organizationId: string
  dealId: string
  currency: string
  canManage: boolean
  archived: boolean
}) {
  const { t, i18n } = useTranslation()
  const costs = useDealCosts(organizationId, dealId)
  const profitability = useDealProfitability(organizationId, dealId)
  const [editor, setEditor] = useState<DealCost | true | null>(null)
  const [deleting, setDeleting] = useState<DealCost | null>(null)
  const [expanded, setExpanded] = useState(false)
  const remove = useDeleteDealCost(organizationId, dealId)
  const money = useMemo(
    () => new Intl.NumberFormat(i18n.language, { style: 'currency', currency }),
    [currency, i18n.language],
  )
  const summary = profitability.data
  const lines = costs.data ?? summary?.costs ?? summary?.lines ?? []
  const failure = costs.error ?? profitability.error
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', mt: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          px: 3,
          py: 2.5,
          gap: 2,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Box>
          <Typography component="h2" variant="h6">
            {t('crm.costing.profitability')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('crm.costing.profitabilityDescription')}
          </Typography>
        </Box>
        <Button
          aria-expanded={expanded}
          endIcon={
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 180ms',
              }}
            >
              <AppIcon icon={chevronDownIcon} />
            </Box>
          }
          onClick={() => setExpanded((current) => !current)}
        >
          {t(expanded ? 'crm.costing.hideProfitability' : 'crm.costing.showProfitability')}
        </Button>
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Divider />
        {canManage && !archived ? (
          <Box sx={{ px: 3, pt: 2.5, textAlign: { sm: 'right' } }}>
            <Button startIcon={<AppIcon icon={plusIcon} />} onClick={() => setEditor(true)}>
              {t('crm.costing.addDealCost')}
            </Button>
          </Box>
        ) : null}
        {failure ? (
          <Box sx={{ p: 3 }}>
            <Failure
              error={failure}
              retry={() => {
                void costs.refetch()
                void profitability.refetch()
              }}
            />
          </Box>
        ) : costs.isPending || profitability.isPending ? (
          <Box sx={{ p: 3 }}>
            <Loading />
          </Box>
        ) : (
          <>
            {summary ? (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <RecordMetricStrip
                  items={[
                    {
                      key: 'revenue',
                      label: t('crm.costing.netRevenue'),
                      value: money.format(Number(summary.net_revenue)),
                    },
                    {
                      key: 'cost',
                      label: t('crm.costing.estimatedCosts'),
                      value: money.format(Number(summary.estimated_cost_total)),
                    },
                    {
                      key: 'profit',
                      label: t('crm.costing.grossProfit'),
                      value: money.format(Number(summary.estimated_gross_profit)),
                    },
                    {
                      key: 'margin',
                      label: t('crm.costing.grossMargin'),
                      value:
                        summary.estimated_margin_percent == null
                          ? '—'
                          : `${Number(summary.estimated_margin_percent).toLocaleString(i18n.language, { maximumFractionDigits: 2 })}%`,
                    },
                  ]}
                />
              </Box>
            ) : null}
            <Divider />
            {!lines.length ? (
              <Empty
                title={t('crm.costing.noDealCostsTitle')}
                description={t('crm.costing.noDealCostsDescription')}
              />
            ) : (
              <Stack divider={<Divider />}>
                {lines.map((line) => (
                  <Box
                    key={line.id}
                    sx={{
                      px: 3,
                      py: 2,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(0,1fr) auto auto' },
                      gap: 2,
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{line.service_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {line.collaborator_name} · {t(`crm.costing.statuses.${line.status}`)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {money.format(Number(line.total_cost))}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {line.quantity} × {money.format(Number(line.unit_cost))}
                      </Typography>
                    </Box>
                    {canManage && !archived ? (
                      <Stack direction="row">
                        <Tooltip title={t('common.edit')}>
                          <IconButton
                            aria-label={t('crm.costing.editDealCost')}
                            onClick={() => setEditor(line)}
                          >
                            <AppIcon icon={editIcon} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton
                            aria-label={t('crm.costing.deleteDealCost')}
                            onClick={() => setDeleting(line)}
                          >
                            <AppIcon icon={deleteIcon} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            )}
          </>
        )}
      </Collapse>
      {editor ? (
        <DealCostDrawer
          organizationId={organizationId}
          dealId={dealId}
          currency={currency}
          cost={editor === true ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      ) : null}
      <Dialog
        open={Boolean(deleting)}
        onClose={remove.isPending ? undefined : () => setDeleting(null)}
      >
        <DialogTitle>{t('crm.costing.deleteCostTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('crm.costing.deleteCostDescription', { name: deleting?.service_name })}
          </Typography>
          {remove.isError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {remove.error.message}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() =>
              deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
            }
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
