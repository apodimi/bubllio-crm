import { useState } from 'react'
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import { useCompanies } from '../../features/companies'
import { contactKeys, useContacts } from '../../features/contacts'
import { organizationPath, useWorkspace, canCreateRecords } from '../../features/organizations'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import { CreateDialog } from '../../components/common/CreateDialog'

export function ContactsPage() {
  const org = useWorkspace()
  const query = useContacts(org.id)
  const companies = useCompanies(org.id)
  const [search, setSearch] = useState('')
  const [create, setCreate] = useState(false)
  const rows = (query.data ?? []).filter((contact) =>
    [contact.first_name + ' ' + contact.last_name, contact.email].some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    ),
  )
  const error = query.error || companies.error
  return (
    <>
      <PageHeading
        title="Contacts"
        description="The people behind your relationships."
        action={
          canCreateRecords(org) && (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              disabled={!companies.data?.length}
              onClick={() => setCreate(true)}
            >
              Add contact
            </Button>
          )
        }
      />
      <TextField
        label="Search contacts"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 3, width: { xs: '100%', sm: 360 } }}
      />
      {error ? (
        <Failure error={error} />
      ) : !query.data || !companies.data ? (
        <Loading />
      ) : (
        <Paper variant="outlined">
          {rows.length === 0 ? (
            <Empty
              title={search ? 'No matches' : 'Get to know your people'}
              description={
                search
                  ? 'Try another name or email.'
                  : companies.data.length
                    ? 'Add a contact linked to a company.'
                    : 'Create a company first, then add its contacts.'
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Job title</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((contact) => (
                    <TableRow key={contact.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {contact.first_name} {contact.last_name}
                      </TableCell>
                      <TableCell>
                        {companies.data.find((company) => company.id === contact.company)?.name ||
                          'Unavailable company'}
                      </TableCell>
                      <TableCell>{contact.email || '—'}</TableCell>
                      <TableCell>{contact.job_title || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
      {create && (
        <CreateDialog
          title="Add contact"
          path={organizationPath(org.id) + 'contacts/'}
          invalidate={contactKeys.byOrganization(org.id)}
          onClose={() => setCreate(false)}
          fields={[
            {
              name: 'company',
              label: 'Company',
              required: true,
              options: (companies.data ?? []).map((company) => ({
                value: company.id,
                label: company.name,
              })),
            },
            { name: 'first_name', label: 'First name', required: true, maxLength: 150 },
            { name: 'last_name', label: 'Last name', maxLength: 150 },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'job_title', label: 'Job title', maxLength: 150 },
          ]}
        />
      )}
    </>
  )
}
