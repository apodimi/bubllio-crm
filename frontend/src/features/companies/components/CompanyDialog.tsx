import { zodResolver } from '@hookform/resolvers/zod'
import CloseRounded from '@mui/icons-material/CloseRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { canCreateRecords, useWorkspace } from '../../organizations'
import type { Company } from '../../../types/company.types'
import { companySchema } from '../companySchema'
import type { CompanyFormValues } from '../companySchema'
import { useCompanyAssignees, useCreateCompany, useUpdateCompany } from '../hooks/useCompanies'

const stages = ['lead', 'prospect', 'customer', 'inactive'] as const

type FieldProps = {
  control: ReturnType<typeof useForm<CompanyFormValues>>['control']
  disabled: boolean
  errors: ReturnType<typeof useForm<CompanyFormValues>>['formState']['errors']
}

function MoreDetails({ control, disabled, errors }: FieldProps) {
  const { t } = useTranslation()

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        borderTop: 1,
        borderBottom: 1,
        borderColor: 'divider',
        borderRadius: '0 !important',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ px: 0 }}>
        <Box>
          <Typography variant="subtitle2">{t('crm.companies.form.moreDetails')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('crm.companies.form.moreDetailsHint')}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 1, pb: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="industry"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('crm.companies.profileContent.industry')}
                  error={Boolean(errors.industry)}
                  helperText={
                    errors.industry
                      ? t('crm.companies.form.maxCharacters', { count: 120 })
                      : undefined
                  }
                  disabled={disabled}
                  sx={{ flex: 1 }}
                />
              )}
            />
            <Controller
              name="website"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('crm.companies.profileContent.website')}
                  type="url"
                  error={Boolean(errors.website)}
                  helperText={errors.website ? t('crm.companies.form.invalidUrl') : undefined}
                  disabled={disabled}
                  sx={{ flex: 1 }}
                />
              )}
            />
          </Stack>
          <Divider />
          <Typography variant="subtitle2">{t('crm.companies.form.businessAddress')}</Typography>
          <Controller
            name="address_line_1"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('crm.companies.profileContent.address')}
                error={Boolean(errors.address_line_1)}
                helperText={
                  errors.address_line_1
                    ? t('crm.companies.form.maxCharacters', { count: 255 })
                    : undefined
                }
                disabled={disabled}
              />
            )}
          />
          <Controller
            name="address_line_2"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('crm.companies.form.addressLine2')}
                error={Boolean(errors.address_line_2)}
                helperText={
                  errors.address_line_2
                    ? t('crm.companies.form.maxCharacters', { count: 255 })
                    : undefined
                }
                disabled={disabled}
              />
            )}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('crm.companies.form.city')}
                  error={Boolean(errors.city)}
                  helperText={
                    errors.city ? t('crm.companies.form.maxCharacters', { count: 120 }) : undefined
                  }
                  disabled={disabled}
                  sx={{ flex: 1 }}
                />
              )}
            />
            <Controller
              name="postal_code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('crm.companies.form.postalCode')}
                  error={Boolean(errors.postal_code)}
                  helperText={
                    errors.postal_code
                      ? t('crm.companies.form.maxCharacters', { count: 32 })
                      : undefined
                  }
                  disabled={disabled}
                  sx={{ flex: 1 }}
                />
              )}
            />
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('crm.companies.form.country')}
                  placeholder="GR"
                  error={Boolean(errors.country)}
                  helperText={errors.country ? t('crm.companies.form.countryCode') : undefined}
                  disabled={disabled}
                  slotProps={{ htmlInput: { maxLength: 2 } }}
                  sx={{ flex: 0.7 }}
                />
              )}
            />
          </Stack>
          <Divider />
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('crm.companies.profileContent.internalNotes')}
                multiline
                minRows={4}
                error={Boolean(errors.notes)}
                helperText={
                  errors.notes
                    ? t('crm.companies.form.maxCharacters', { count: 5000 })
                    : t('crm.companies.form.notesHint')
                }
                disabled={disabled}
              />
            )}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}

export function CompanyDialog({
  organizationId,
  company,
  onClose,
}: {
  organizationId: string
  company?: Company
  onClose: () => void
}) {
  const { t } = useTranslation()
  const workspace = useWorkspace()
  const canManage = workspace.id === organizationId && canCreateRecords(workspace)
  const create = useCreateCompany(organizationId)
  const update = useUpdateCompany(organizationId, company?.id ?? '')
  const mutation = company ? update : create
  const members = useCompanyAssignees(organizationId, canManage)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name ?? '',
      tax_id: company?.tax_id ?? '',
      industry: company?.industry ?? '',
      email: company?.email ?? '',
      phone_number: company?.phone_number ?? '',
      website: company?.website ?? '',
      address_line_1: company?.address_line_1 ?? '',
      address_line_2: company?.address_line_2 ?? '',
      city: company?.city ?? '',
      postal_code: company?.postal_code ?? '',
      country: company?.country ?? '',
      notes: company?.notes ?? '',
      lifecycle_stage: company?.lifecycle_stage ?? 'lead',
      assigned_to: company?.assigned_to ?? null,
    },
  })

  const submit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
      onClose()
    } catch {
      // React Query exposes the normalized API error in the drawer.
    }
  })

  if (!canManage) {
    return null
  }

  let submitLabel = t('crm.companies.form.create')
  if (mutation.isPending) {
    submitLabel = t('crm.companies.form.saving')
  } else if (company) {
    submitLabel = t('crm.companies.form.saveChanges')
  }

  let nameError: string | undefined
  if (errors.name) {
    if (errors.name.message === 'Company name is required.') {
      nameError = t('crm.companies.form.nameRequired')
    } else {
      nameError = t('crm.companies.form.maxCharacters', { count: 255 })
    }
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={mutation.isPending ? undefined : onClose}
      ModalProps={{ keepMounted: false }}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 620 },
          maxWidth: '100vw',
          bgcolor: 'background.default',
        },
      }}
    >
      <Box
        component="form"
        onSubmit={(event) => void submit(event)}
        sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}
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
          <Stack
            direction="row"
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Box>
              <Typography variant="h5">
                {company ? t('crm.companies.form.editTitle') : t('crm.companies.form.addTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {company ? t('crm.companies.form.editHint') : t('crm.companies.form.addHint')}
              </Typography>
            </Box>
            <IconButton
              aria-label={t('crm.companies.form.close')}
              onClick={onClose}
              disabled={mutation.isPending}
            >
              <CloseRounded />
            </IconButton>
          </Stack>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2.5, sm: 4 }, py: 4 }}>
          <Stack spacing={2.5}>
            {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('crm.companies.form.name')}
                  required
                  error={Boolean(errors.name)}
                  helperText={nameError}
                  disabled={mutation.isPending}
                  autoFocus
                />
              )}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="lifecycle_stage"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('crm.companies.form.stage')}
                    select
                    required
                    disabled={mutation.isPending}
                    sx={{ flex: 1 }}
                  >
                    {stages.map((stage) => (
                      <MenuItem key={stage} value={stage}>
                        {t(`crm.companies.stages.${stage}`)}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="tax_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('crm.companies.profileContent.taxId')}
                    error={Boolean(errors.tax_id)}
                    helperText={
                      errors.tax_id
                        ? t('crm.companies.form.maxCharacters', { count: 64 })
                        : undefined
                    }
                    disabled={mutation.isPending}
                    sx={{ flex: 1 }}
                  />
                )}
              />
            </Stack>
            <Controller
              name="assigned_to"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label={t('crm.companies.profileContent.accountOwner')}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? null : Number(event.target.value))
                  }
                  disabled={mutation.isPending || members.isPending}
                  helperText={t('crm.companies.form.ownerHint')}
                >
                  <MenuItem value="">{t('crm.companies.unassigned')}</MenuItem>
                  {(members.data ?? []).map((member) => (
                    <MenuItem key={member.id} value={Number(member.id)}>
                      {member.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('crm.companies.profileContent.email')}
                  type="email"
                  error={Boolean(errors.email)}
                  helperText={errors.email ? t('crm.companies.form.invalidEmail') : undefined}
                  disabled={mutation.isPending}
                />
              )}
            />
            <Controller
              name="phone_number"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('crm.companies.profileContent.phone')}
                  error={Boolean(errors.phone_number)}
                  helperText={
                    errors.phone_number
                      ? t('crm.companies.form.maxCharacters', { count: 20 })
                      : undefined
                  }
                  disabled={mutation.isPending}
                />
              )}
            />
            <MoreDetails control={control} disabled={mutation.isPending} errors={errors} />
          </Stack>
        </Box>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            justifyContent: 'flex-end',
            px: { xs: 2.5, sm: 4 },
            py: 2.5,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Button onClick={onClose} disabled={mutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {submitLabel}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
