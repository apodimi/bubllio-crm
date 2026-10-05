import { useState } from 'react'
import type { FormEvent } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Alert, Box, Button, Drawer, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type { Company } from '../../../types/company.types'
import type { Contact, ContactInput } from '../../../types/contact.types'
import { useCreateContact, useUpdateContact } from '../hooks/useContacts'

const emptyContact: ContactInput = {
  company: '',
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  department: '',
  job_title: '',
}

export function ContactDrawer({ organizationId, companies, contact, onClose }: {
  organizationId: string
  companies: Company[]
  contact?: Contact
  onClose: () => void
}) {
  const create = useCreateContact(organizationId)
  const update = useUpdateContact(organizationId, contact?.id ?? '')
  const mutation = contact ? update : create
  const [values, setValues] = useState<ContactInput>(contact ? {
    company: contact.company,
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    phone_number: contact.phone_number,
    department: contact.department,
    job_title: contact.job_title,
  } : emptyContact)

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await mutation.mutateAsync(values)
      onClose()
    } catch {
      // The normalized API error is shown below.
    }
  }

  function field(name: keyof ContactInput, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  return (
    <Drawer anchor="right" open onClose={mutation.isPending ? undefined : onClose} sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 560 }, maxWidth: '100vw', bgcolor: 'background.default' } }}>
      <Box component="form" onSubmit={(event) => void submit(event)} sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={2} sx={{ px: { xs: 2.5, sm: 4 }, py: 2.5, alignItems: 'flex-start', justifyContent: 'space-between', bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Box>
            <Typography variant="h5">{contact ? 'Edit contact' : 'Add contact'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Keep the person and their role connected to the right company.</Typography>
          </Box>
          <IconButton aria-label="Close contact form" onClick={onClose} disabled={mutation.isPending}><CloseRounded /></IconButton>
        </Stack>
        <Stack spacing={2.5} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2.5, sm: 4 }, py: 4 }}>
          {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
          <TextField select required label="Company" value={values.company} onChange={(event) => field('company', event.target.value)} disabled={mutation.isPending}>
            {companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField required autoFocus label="First name" value={values.first_name} onChange={(event) => field('first_name', event.target.value)} disabled={mutation.isPending} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 150 } }} />
            <TextField label="Last name" value={values.last_name} onChange={(event) => field('last_name', event.target.value)} disabled={mutation.isPending} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 150 } }} />
          </Stack>
          <TextField type="email" label="Email" value={values.email} onChange={(event) => field('email', event.target.value)} disabled={mutation.isPending} />
          <TextField label="Phone" value={values.phone_number} onChange={(event) => field('phone_number', event.target.value)} disabled={mutation.isPending} slotProps={{ htmlInput: { maxLength: 20 } }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Job title" value={values.job_title} onChange={(event) => field('job_title', event.target.value)} disabled={mutation.isPending} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 150 } }} />
            <TextField label="Department" value={values.department} onChange={(event) => field('department', event.target.value)} disabled={mutation.isPending} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 150 } }} />
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', px: { xs: 2.5, sm: 4 }, py: 2.5, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : contact ? 'Save changes' : 'Create contact'}</Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
