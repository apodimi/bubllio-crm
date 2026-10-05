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
import type { Company } from '../../../types/company.types'
import { companySchema } from '../companySchema'
import type { CompanyFormValues } from '../companySchema'
import { useCreateCompany, useUpdateCompany } from '../hooks/useCompanies'

const stages = ['lead', 'prospect', 'customer', 'inactive'] as const

type FieldProps = {
  control: ReturnType<typeof useForm<CompanyFormValues>>['control']
  disabled: boolean
  errors: ReturnType<typeof useForm<CompanyFormValues>>['formState']['errors']
}

function MoreDetails({ control, disabled, errors }: FieldProps) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        borderTop: 1,
        borderBottom: 1,
        borderColor: 'divider',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ px: 0 }}>
        <Box>
          <Typography variant="subtitle2">More details</Typography>
          <Typography variant="body2" color="text.secondary">
            Industry, website, address, and internal notes
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
                  label="Industry"
                  error={Boolean(errors.industry)}
                  helperText={errors.industry?.message}
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
                  label="Website"
                  type="url"
                  error={Boolean(errors.website)}
                  helperText={errors.website?.message}
                  disabled={disabled}
                  sx={{ flex: 1 }}
                />
              )}
            />
          </Stack>
          <Divider />
          <Typography variant="subtitle2">Business address</Typography>
          <Controller
            name="address_line_1"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Address"
                error={Boolean(errors.address_line_1)}
                helperText={errors.address_line_1?.message}
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
                label="Address line 2"
                error={Boolean(errors.address_line_2)}
                helperText={errors.address_line_2?.message}
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
                  label="City"
                  error={Boolean(errors.city)}
                  helperText={errors.city?.message}
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
                  label="Postal code"
                  error={Boolean(errors.postal_code)}
                  helperText={errors.postal_code?.message}
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
                  label="Country"
                  placeholder="GR"
                  error={Boolean(errors.country)}
                  helperText={errors.country?.message}
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
                label="Internal notes"
                multiline
                minRows={4}
                error={Boolean(errors.notes)}
                helperText={errors.notes?.message ?? 'Visible only inside this workspace.'}
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
  const create = useCreateCompany(organizationId)
  const update = useUpdateCompany(organizationId, company?.id ?? '')
  const mutation = company ? update : create
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
              <Typography variant="h5">{company ? 'Edit company' : 'Add company'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {company
                  ? 'Keep the client record accurate and useful.'
                  : 'Start with the essentials. Add the rest when you need it.'}
              </Typography>
            </Box>
            <IconButton
              aria-label="Close company form"
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
                  label="Company name"
                  required
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
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
                    label="Stage"
                    select
                    required
                    disabled={mutation.isPending}
                    sx={{ flex: 1 }}
                  >
                    {stages.map((stage) => (
                      <MenuItem key={stage} value={stage}>
                        {stage[0].toUpperCase() + stage.slice(1)}
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
                    label="Tax / VAT ID"
                    error={Boolean(errors.tax_id)}
                    helperText={errors.tax_id?.message}
                    disabled={mutation.isPending}
                    sx={{ flex: 1 }}
                  />
                )}
              />
            </Stack>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
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
                  label="Phone"
                  error={Boolean(errors.phone_number)}
                  helperText={errors.phone_number?.message}
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
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : company ? 'Save changes' : 'Create company'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
