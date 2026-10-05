import { useState } from 'react'
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined'
import CloseRounded from '@mui/icons-material/CloseRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import RestoreRounded from '@mui/icons-material/RestoreRounded'
import { Avatar, Box, Button, Chip, Divider, Drawer, IconButton, Link, Stack, Typography } from '@mui/material'
import type { Company } from '../../../types/company.types'
import type { Contact } from '../../../types/contact.types'
import { Loading } from '../../../components/common/Feedback'
import { useArchiveContact, useContactActivity, useRestoreContact } from '../hooks/useContacts'
import { ContactDrawer } from './ContactDrawer'

export function ContactProfileDrawer({ organizationId, contact, companies, onClose, onCompany }: { organizationId: string; contact: Contact; companies: Company[]; onClose: () => void; onCompany: (companyId: string) => void }) {
  const [editing, setEditing] = useState(false)
  const activity = useContactActivity(organizationId, contact.id)
  const archive = useArchiveContact(organizationId)
  const restore = useRestoreContact(organizationId)
  const name = `${contact.first_name} ${contact.last_name}`.trim()
  const action = contact.archived_at ? restore : archive
  return <>
    <Drawer anchor="right" open onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 560 }, maxWidth: '100vw', bgcolor: 'background.default' } }}>
      <Box sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}><Avatar sx={{ width: 52, height: 52 }}>{contact.first_name[0]}{contact.last_name[0]}</Avatar><Box><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Typography variant="h5">{name}</Typography>{contact.is_primary ? <Chip size="small" label="Primary" color="primary" /> : null}</Stack><Typography color="text.secondary">{contact.job_title || 'Contact'}{contact.department ? ` · ${contact.department}` : ''}</Typography></Box></Stack>
          <IconButton aria-label="Close contact profile" onClick={onClose}><CloseRounded /></IconButton>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 3 }}><Button variant="contained" startIcon={<EditRounded />} onClick={() => setEditing(true)}>Edit contact</Button><Button variant="outlined" color={contact.archived_at ? 'primary' : 'inherit'} startIcon={contact.archived_at ? <RestoreRounded /> : <ArchiveOutlined />} onClick={() => action.mutate(contact.id, { onSuccess: onClose })}>{contact.archived_at ? 'Restore' : 'Archive'}</Button></Stack>
      </Box>
      <Stack spacing={3} sx={{ p: { xs: 2.5, sm: 4 }, overflowY: 'auto' }}>
        <Box><Typography variant="overline" color="text.secondary">Company</Typography><Button variant="text" sx={{ display: 'block', px: 0 }} onClick={() => onCompany(contact.company)}>{contact.company_name}</Button></Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}><Box sx={{ flex: 1 }}><Typography variant="overline" color="text.secondary">Email</Typography><Typography>{contact.email ? <Link href={`mailto:${contact.email}`}>{contact.email}</Link> : '—'}</Typography></Box><Box sx={{ flex: 1 }}><Typography variant="overline" color="text.secondary">Phone</Typography><Typography>{contact.phone_number ? <Link href={`tel:${contact.phone_number}`}>{contact.phone_number}</Link> : '—'}</Typography></Box></Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}><Box sx={{ flex: 1 }}><Typography variant="overline" color="text.secondary">Owner</Typography><Typography>{contact.assigned_to_name || 'Unassigned'}</Typography></Box><Box sx={{ flex: 1 }}><Typography variant="overline" color="text.secondary">Status</Typography><Typography sx={{ textTransform: 'capitalize' }}>{contact.status}</Typography></Box></Stack>
        <Divider /><Box><Typography variant="h6" sx={{ mb: 2 }}>Activity</Typography>{activity.isPending ? <Loading /> : <Stack spacing={2}>{(activity.data ?? []).map((item) => <Box key={item.id}><Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{item.action}</Typography><Typography variant="body2" color="text.secondary">{item.actor_name} · {new Date(item.created_at).toLocaleString()}</Typography></Box>)}</Stack>}</Box>
      </Stack>
    </Drawer>
    {editing ? <ContactDrawer organizationId={organizationId} companies={companies} contact={contact} onClose={() => setEditing(false)} /> : null}
  </>
}
