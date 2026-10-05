import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
      // React Query exposes the normalized API error in the dialog.
    }
  })

  return (
    <Dialog open onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="md">
      <form onSubmit={(event) => void submit(event)}>
        <DialogTitle>{company ? 'Edit company' : 'Add company'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
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
              <Controller
                name="industry"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Industry"
                    error={Boolean(errors.industry)}
                    helperText={errors.industry?.message}
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                    disabled={mutation.isPending}
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
                  disabled={mutation.isPending}
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
                  disabled={mutation.isPending}
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
                    disabled={mutation.isPending}
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
                    disabled={mutation.isPending}
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
                    label="Country code"
                    placeholder="GR"
                    error={Boolean(errors.country)}
                    helperText={errors.country?.message}
                    disabled={mutation.isPending}
                    slotProps={{ htmlInput: { maxLength: 2 } }}
                    sx={{ flex: 1 }}
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
                  minRows={3}
                  error={Boolean(errors.notes)}
                  helperText={errors.notes?.message ?? 'Visible only inside this workspace.'}
                  disabled={mutation.isPending}
                />
              )}
            />
            <Controller
              name="lifecycle_stage"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Stage" select required disabled={mutation.isPending}>
                  {stages.map((stage) => (
                    <MenuItem key={stage} value={stage}>
                      {stage[0].toUpperCase() + stage.slice(1)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : company ? 'Save changes' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
