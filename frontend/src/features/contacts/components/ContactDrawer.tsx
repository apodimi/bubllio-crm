import { Controller, useForm, type Control, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import CloseRounded from '@mui/icons-material/CloseRounded'
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import type { Contact, ContactInput } from '../../../types/contact.types'
import { useCompanies, useCompanyAssignees } from '../../companies'
import { useWorkspace } from '../../organizations'
import { contactSchema, type ContactFormValues } from '../contactSchema'
import { useCreateContact, useUpdateContact } from '../hooks/useContacts'

const emptyContact: ContactFormValues = {
  company: '',
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  department: '',
  job_title: '',
  assigned_to: null,
  status: 'active',
  is_primary: false,
}

type TextContactField =
  'first_name' | 'last_name' | 'email' | 'phone_number' | 'job_title' | 'department'

function ContactTextField({
  control,
  errors,
  name,
  label,
  disabled,
  required = false,
  type = 'text',
}: {
  control: Control<ContactFormValues>
  errors: FieldErrors<ContactFormValues>
  name: TextContactField
  label: string
  disabled: boolean
  required?: boolean
  type?: string
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          required={required}
          type={type}
          label={label}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message}
          disabled={disabled}
          sx={{ flex: 1 }}
        />
      )}
    />
  )
}

function getDefaultValues(contact?: Contact): ContactFormValues {
  if (!contact) {
    return emptyContact
  }

  return {
    company: contact.company,
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    phone_number: contact.phone_number,
    department: contact.department,
    job_title: contact.job_title,
    assigned_to: contact.assigned_to,
    status: contact.status,
    is_primary: contact.is_primary,
  }
}

export function ContactDrawer({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const workspace = useWorkspace()
  const companies = useCompanies(workspace.id)
  const assignees = useCompanyAssignees(workspace.id)
  const create = useCreateContact(workspace.id)
  const update = useUpdateContact(workspace.id, contact?.id ?? '')
  const mutation = contact ? update : create
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: getDefaultValues(contact),
  })

  async function submit(values: ContactFormValues) {
    try {
      await mutation.mutateAsync(values as ContactInput)
      onClose()
    } catch {
      // The normalized API error is shown below.
    }
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={mutation.isPending ? undefined : onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 560 },
          maxWidth: '100vw',
          bgcolor: 'background.default',
        },
      }}
    >
      <Box
        component="form"
        onSubmit={(event) => void handleSubmit(submit)(event)}
        sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 2.5,
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h5">{contact ? 'Edit contact' : 'Add contact'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Keep the person and their role connected to the right company.
            </Typography>
          </Box>
          <IconButton
            aria-label="Close contact form"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            <CloseRounded />
          </IconButton>
        </Stack>

        <Stack spacing={2.5} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2.5, sm: 4 }, py: 4 }}>
          {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
          <Controller
            name="company"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                required
                label="Company"
                error={Boolean(errors.company)}
                helperText={errors.company?.message}
                disabled={mutation.isPending || companies.isPending}
              >
                {(companies.data ?? []).map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ContactTextField
              control={control}
              errors={errors}
              name="first_name"
              label="First name"
              disabled={mutation.isPending}
              required
            />
            <ContactTextField
              control={control}
              errors={errors}
              name="last_name"
              label="Last name"
              disabled={mutation.isPending}
            />
          </Stack>
          <ContactTextField
            control={control}
            errors={errors}
            name="email"
            label="Email"
            type="email"
            disabled={mutation.isPending}
          />
          <ContactTextField
            control={control}
            errors={errors}
            name="phone_number"
            label="Phone"
            disabled={mutation.isPending}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ContactTextField
              control={control}
              errors={errors}
              name="job_title"
              label="Job title"
              disabled={mutation.isPending}
            />
            <ContactTextField
              control={control}
              errors={errors}
              name="department"
              label="Department"
              disabled={mutation.isPending}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="assigned_to"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Contact owner"
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value ? Number(event.target.value) : null)
                  }
                  disabled={mutation.isPending}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {(assignees.data ?? []).map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      {person.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Status"
                  disabled={mutation.isPending}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="former">Former</MenuItem>
                </TextField>
              )}
            />
          </Stack>
          <Controller
            name="is_primary"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Primary contact"
                value={field.value ? 'yes' : 'no'}
                onChange={(event) => field.onChange(event.target.value === 'yes')}
                disabled={mutation.isPending}
                helperText="Only one active primary contact is kept per company."
              >
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
              </TextField>
            )}
          />
        </Stack>

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
            {mutation.isPending ? 'Saving…' : contact ? 'Save changes' : 'Create contact'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
