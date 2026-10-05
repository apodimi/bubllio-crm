import { useDeferredValue, useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Stack,
  MenuItem,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import { useCompanies, useDeleteCompany } from '../../features/companies'
import { useWorkspace, canCreateRecords } from '../../features/organizations'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import { CompanyDialog } from '../../features/companies/components/CompanyDialog'
import type { Company } from '../../types/company.types'

export function CompaniesPage() {
  const org = useWorkspace()
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<Company['lifecycle_stage'] | ''>('')
  const deferredSearch = useDeferredValue(search)
  const query = useCompanies(org.id, { search: deferredSearch, lifecycleStage: stage })
  const [create, setCreate] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const remove = useDeleteCompany(org.id)
  const canManage = canCreateRecords(org)
  const rows = query.data ?? []
  return (
    <>
      <PageHeading
        title="Companies"
        description="From first introductions to lasting partnerships."
        action={
          canCreateRecords(org) && (
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setCreate(true)}>
              Add company
            </Button>
          )
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search companies"
          placeholder="Name, tax ID, city, industry…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: { xs: '100%', sm: 420 } }}
        />
        <TextField
          select
          label="Lifecycle stage"
          value={stage}
          onChange={(event) => setStage(event.target.value as Company['lifecycle_stage'] | '')}
          sx={{ width: { xs: '100%', sm: 200 } }}
        >
          <MenuItem value="">All stages</MenuItem>
          <MenuItem value="lead">Lead</MenuItem>
          <MenuItem value="prospect">Prospect</MenuItem>
          <MenuItem value="customer">Customer</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Stack>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Paper variant="outlined">
          {rows.length === 0 ? (
            <Empty
              title={search || stage ? 'No matches' : 'Your next partnership awaits'}
              description={
                search || stage
                  ? 'Try another search or lifecycle stage.'
                  : 'Add a company to start building your CRM.'
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Business profile</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Stage</TableCell>
                    {canManage && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((company) => (
                    <TableRow key={company.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>{company.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {company.email || company.phone_number || 'No contact details'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{company.industry || '—'}</Typography>
                        {company.tax_id && (
                          <Typography variant="caption" color="text.secondary">
                            Tax ID: {company.tax_id}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{[company.city, company.country].filter(Boolean).join(', ') || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={company.lifecycle_stage}
                          color={company.lifecycle_stage === 'customer' ? 'primary' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <Tooltip title="Edit company">
                            <IconButton
                              aria-label={`Edit ${company.name}`}
                              onClick={() => setEditing(company)}
                            >
                              <EditRounded />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete company">
                            <IconButton
                              aria-label={`Delete ${company.name}`}
                              onClick={() => setDeleting(company)}
                            >
                              <DeleteOutlineRounded />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
      {create && <CompanyDialog organizationId={org.id} onClose={() => setCreate(false)} />}
      {editing && (
        <CompanyDialog organizationId={org.id} company={editing} onClose={() => setEditing(null)} />
      )}
      <Dialog
        open={Boolean(deleting)}
        onClose={remove.isPending ? undefined : () => setDeleting(null)}
      >
        <DialogTitle>Delete company?</DialogTitle>
        <DialogContent>
          {remove.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {remove.error.message}
            </Alert>
          )}
          <Typography>
            {deleting?.name} and all of its contacts will be permanently deleted. This cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleting(null)} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => {
              if (!deleting) return
              remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Delete company'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
