import { useState } from 'react'
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
  const query = useCompanies(org.id)
  const [search, setSearch] = useState('')
  const [create, setCreate] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const remove = useDeleteCompany(org.id)
  const canManage = canCreateRecords(org)
  const rows = (query.data ?? []).filter((company) =>
    [company.name, company.email].some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    ),
  )
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
      <TextField
        label="Search companies"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 3, width: { xs: '100%', sm: 360 } }}
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Paper variant="outlined">
          {rows.length === 0 ? (
            <Empty
              title={search ? 'No matches' : 'Your next partnership awaits'}
              description={
                search ? 'Try another name or email.' : 'Add a company to start building your CRM.'
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Stage</TableCell>
                    {canManage && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((company) => (
                    <TableRow key={company.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{company.name}</TableCell>
                      <TableCell>{company.email || '—'}</TableCell>
                      <TableCell>{company.phone_number || '—'}</TableCell>
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
