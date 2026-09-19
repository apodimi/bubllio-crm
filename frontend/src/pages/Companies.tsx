import { useState } from 'react'
import { Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import { keys, organizationPath } from '../api/queries'
import { useCompanies } from '../api/hooks'
import { useWorkspace, canCreateRecords } from '../app/workspace'
import { Empty, Failure, Loading, PageHeading } from '../components/Feedback'
import { CreateDialog } from '../components/CreateDialog'

export function Companies() {
  const org = useWorkspace()
  const query = useCompanies(org.id)
  const [search, setSearch] = useState('')
  const [create, setCreate] = useState(false)
  const rows = (query.data ?? []).filter(company => [company.name, company.email].some(value => value.toLowerCase().includes(search.toLowerCase())))
  return <>
    <PageHeading title="Companies" description="From first introductions to lasting partnerships."
      action={canCreateRecords(org) && <Button variant="contained" startIcon={<AddRounded />} onClick={() => setCreate(true)}>Add company</Button>} />
    <TextField label="Search companies" value={search} onChange={event => setSearch(event.target.value)} sx={{ mb: 3, width: { xs: '100%', sm: 360 } }} />
    {query.isPending ? <Loading /> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()} /> :
      <Paper variant="outlined">{rows.length === 0 ? <Empty title={search ? 'No matches' : 'Your next partnership awaits'} description={search ? 'Try another name or email.' : 'Add a company to start building your CRM.'} /> :
        <TableContainer><Table><TableHead><TableRow><TableCell>Company</TableCell><TableCell>Email</TableCell><TableCell>Phone</TableCell><TableCell>Stage</TableCell></TableRow></TableHead>
          <TableBody>{rows.map(company => <TableRow key={company.id} hover><TableCell sx={{ fontWeight: 600 }}>{company.name}</TableCell><TableCell>{company.email || '—'}</TableCell><TableCell>{company.phone_number || '—'}</TableCell><TableCell><Chip size="small" label={company.lifecycle_stage} color={company.lifecycle_stage === 'customer' ? 'primary' : 'default'} variant="outlined" /></TableCell></TableRow>)}</TableBody>
        </Table></TableContainer>}
      </Paper>}
    {create && <CreateDialog title="Add company" path={organizationPath(org.id) + 'companies/'} invalidate={keys.companies(org.id)} onClose={() => setCreate(false)} fields={[
      { name: 'name', label: 'Company name', required: true, maxLength: 255 },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone_number', label: 'Phone', maxLength: 20 },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'lifecycle_stage', label: 'Stage', required: true, options: ['lead', 'prospect', 'customer', 'inactive'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
    ]} />}
  </>
}
