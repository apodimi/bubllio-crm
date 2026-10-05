import { useDeferredValue, useState } from 'react'
import AddRounded from '@mui/icons-material/AddRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded'
import PhoneOutlined from '@mui/icons-material/PhoneOutlined'
import { Alert, Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import { useCompanies } from '../../features/companies'
import { useContacts, useDeleteContact } from '../../features/contacts'
import { ContactDrawer } from '../../features/contacts/components/ContactDrawer'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import type { Contact } from '../../types/contact.types'

const initials = (contact: Contact) => `${contact.first_name[0] ?? ''}${contact.last_name[0] ?? ''}`.toUpperCase()

export function ContactsPage() {
  const org = useWorkspace()
  const companies = useCompanies(org.id)
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('')
  const query = useContacts(org.id, { search: useDeferredValue(search), company })
  const [create, setCreate] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)
  const remove = useDeleteContact(org.id)
  const canManage = canCreateRecords(org)
  const rows = query.data ?? []
  const error = query.error || companies.error

  return <>
    <PageHeading title="Contacts" description="The people behind your relationships." action={canManage ? <Button variant="contained" startIcon={<AddRounded />} disabled={!companies.data?.length} onClick={() => setCreate(true)}>Add contact</Button> : null} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
      <TextField label="Search contacts" placeholder="Name, email, role, department…" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ width: { xs: '100%', sm: 420 } }} />
      <TextField select label="Company" value={company} onChange={(event) => setCompany(event.target.value)} sx={{ width: { xs: '100%', sm: 260 } }}>
        <MenuItem value="">All companies</MenuItem>
        {(companies.data ?? []).map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
      </TextField>
    </Stack>
    {error ? <Failure error={error} retry={() => { void query.refetch(); void companies.refetch() }} /> : query.isPending || companies.isPending ? <Loading /> : <Paper variant="outlined">
      {rows.length === 0 ? <Empty title={search || company ? 'No matches' : 'Get to know your people'} description={search || company ? 'Try changing the search or company filter.' : companies.data.length ? 'Add a contact linked to a company.' : 'Create a company first, then add its contacts.'} /> : <>
        <Stack sx={{ display: { xs: 'flex', sm: 'none' } }} divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
          {rows.map((contact) => <Stack key={contact.id} direction="row" spacing={2} sx={{ p: 2.5, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 14 }}>{initials(contact)}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{contact.first_name} {contact.last_name}</Typography>
              <Typography variant="body2" color="text.secondary">{[contact.job_title, contact.company_name].filter(Boolean).join(' · ')}</Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                {contact.email ? <IconButton size="small" component="a" href={`mailto:${contact.email}`} aria-label={`Email ${contact.first_name}`}><MailOutlineRounded fontSize="small" /></IconButton> : null}
                {contact.phone_number ? <IconButton size="small" component="a" href={`tel:${contact.phone_number}`} aria-label={`Call ${contact.first_name}`}><PhoneOutlined fontSize="small" /></IconButton> : null}
                {canManage ? <IconButton size="small" aria-label={`Edit ${contact.first_name}`} onClick={() => setEditing(contact)}><EditRounded fontSize="small" /></IconButton> : null}
              </Stack>
            </Box>
          </Stack>)}
        </Stack>
        <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}><Table>
          <TableHead><TableRow><TableCell>Contact</TableCell><TableCell>Company</TableCell><TableCell>Role</TableCell><TableCell>Contact details</TableCell>{canManage ? <TableCell align="right">Actions</TableCell> : null}</TableRow></TableHead>
          <TableBody>{rows.map((contact) => <TableRow key={contact.id} hover>
            <TableCell><Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}><Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 12 }}>{initials(contact)}</Avatar><Typography sx={{ fontWeight: 700 }}>{contact.first_name} {contact.last_name}</Typography></Stack></TableCell>
            <TableCell>{contact.company_name}</TableCell>
            <TableCell><Typography variant="body2">{contact.job_title || '—'}</Typography>{contact.department ? <Typography variant="caption" color="text.secondary">{contact.department}</Typography> : null}</TableCell>
            <TableCell>{contact.email ? <Link href={`mailto:${contact.email}`} underline="hover">{contact.email}</Link> : '—'}{contact.phone_number ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>{contact.phone_number}</Typography> : null}</TableCell>
            {canManage ? <TableCell align="right"><Tooltip title="Edit contact"><IconButton aria-label={`Edit ${contact.first_name} ${contact.last_name}`.trim()} onClick={() => setEditing(contact)}><EditRounded /></IconButton></Tooltip><Tooltip title="Delete contact"><IconButton aria-label={`Delete ${contact.first_name} ${contact.last_name}`.trim()} onClick={() => setDeleting(contact)}><DeleteOutlineRounded /></IconButton></Tooltip></TableCell> : null}
          </TableRow>)}</TableBody>
        </Table></TableContainer>
      </>}
    </Paper>}
    {create && companies.data ? <ContactDrawer organizationId={org.id} companies={companies.data} onClose={() => setCreate(false)} /> : null}
    {editing && companies.data ? <ContactDrawer organizationId={org.id} companies={companies.data} contact={editing} onClose={() => setEditing(null)} /> : null}
    <Dialog open={Boolean(deleting)} onClose={remove.isPending ? undefined : () => setDeleting(null)}><DialogTitle>Delete contact?</DialogTitle><DialogContent>{remove.isError ? <Alert severity="error" sx={{ mb: 2 }}>{remove.error.message}</Alert> : null}<Typography>{deleting?.first_name} {deleting?.last_name} will be permanently removed. The company remains unchanged.</Typography></DialogContent><DialogActions sx={{ p: 3 }}><Button onClick={() => setDeleting(null)} disabled={remove.isPending}>Cancel</Button><Button color="error" variant="contained" disabled={remove.isPending} onClick={() => { if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) }) }}>{remove.isPending ? 'Deleting…' : 'Delete contact'}</Button></DialogActions></Dialog>
  </>
}
