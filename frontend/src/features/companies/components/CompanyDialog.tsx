import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
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
      email: company?.email ?? '',
      phone_number: company?.phone_number ?? '',
      website: company?.website ?? '',
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
    <Dialog open onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="sm">
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
