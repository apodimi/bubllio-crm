import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useListPage } from '../../hooks/useListPage'
import { ListPagination } from '../../components/common/ListPagination'
import AddRounded from '@mui/icons-material/AddRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded'
import PhoneOutlined from '@mui/icons-material/PhoneOutlined'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
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
import { useTranslation } from 'react-i18next'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import { useCompanies } from '../../features/companies'
import { useContact, useContactPage, useDeleteContact } from '../../features/contacts'
import { ContactDrawer } from '../../features/contacts/components/ContactDrawer'
import { ContactProfileDrawer } from '../../features/contacts/components/ContactProfileDrawer'
import { CompanyPreviewDrawer } from '../../features/companies/components/CompanyPreviewDrawer'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import type { Contact } from '../../types/contact.types'

const initials = (contact: Contact) =>
  `${contact.first_name[0] ?? ''}${contact.last_name[0] ?? ''}`.toUpperCase()

type ActivePanel =
  | { type: 'create-contact' }
  | { type: 'edit-contact'; contact: Contact }
  | { type: 'view-contact'; contact: Contact }
  | { type: 'view-company'; companyId: string }
  | { type: 'delete-contact'; contact: Contact }
  | null

export function ContactsPage() {
  const { t } = useTranslation()
  const org = useWorkspace()
  const navigate = useNavigate({ from: '/organizations/$organizationId/contacts' })
  const routeSearch = useSearch({ from: '/organizations/$organizationId/contacts' })
  const routeContact = useContact(org.id, routeSearch.contact ?? '')
  const companies = useCompanies(org.id)
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('')
  const [visibility, setVisibility] = useState<'active' | 'archived' | 'all'>('all')
  const debouncedSearch = useDebouncedValue(search)
  const { page, setPage } = useListPage(
    JSON.stringify([org.id, debouncedSearch, company, visibility]),
  )
  const query = useContactPage(
    org.id,
    {
      search: debouncedSearch,
      company,
      archived: visibility,
    },
    page,
  )
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const remove = useDeleteContact(org.id)
  const canManage = canCreateRecords(org)
  const rows = query.data ?? []
  const error = query.error || companies.error

  return (
    <>
      <PageHeading
        title={t('crm.contacts.title')}
        description={t('crm.contacts.description')}
        action={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              disabled={!companies.data?.length}
              onClick={() => setActivePanel({ type: 'create-contact' })}
            >
              {t('crm.contacts.add')}
            </Button>
          ) : null
        }
      />
      <Paper
        component="section"
        aria-label={t('crm.contacts.filters')}
        variant="outlined"
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            lg: 'minmax(0, 2fr) minmax(0, 1.25fr) minmax(0, 1fr)',
          },
          gap: 2,
          p: { xs: 2, md: 2.5 },
          mb: 3,
        }}
      >
        <TextField
          label={t('crm.contacts.search')}
          placeholder={t('crm.contacts.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ gridColumn: { xs: '1 / -1', lg: 'auto' }, minWidth: 0 }}
        />
        <TextField
          select
          label={t('crm.contacts.company')}
          slotProps={{ select: { displayEmpty: true } }}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        >
          <MenuItem value="">{t('crm.contacts.allCompanies')}</MenuItem>
          {(companies.data ?? []).map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('crm.contacts.records')}
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as typeof visibility)}
        >
          <MenuItem value="all">{t('crm.contacts.allRecords')}</MenuItem>
          <MenuItem value="active">{t('crm.contacts.active')}</MenuItem>
          <MenuItem value="archived">{t('crm.contacts.archived')}</MenuItem>
        </TextField>
      </Paper>
      {error ? (
        <Failure
          error={error}
          retry={() => {
            void query.refetch()
            void companies.refetch()
          }}
        />
      ) : query.isPending || companies.isPending ? (
        <Loading />
      ) : (
        <Paper variant="outlined">
          {rows.length === 0 ? (
            <Empty
              title={search || company ? t('crm.contacts.noMatches') : t('crm.contacts.empty')}
              description={
                search || company
                  ? t('crm.contacts.noMatchesDescription')
                  : companies.data.length
                    ? t('crm.contacts.emptyDescription')
                    : t('crm.contacts.createCompanyFirst')
              }
            />
          ) : (
            <>
              <Stack
                sx={{ display: { xs: 'flex', sm: 'none' } }}
                divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}
              >
                {rows.map((contact) => (
                  <Stack
                    key={contact.id}
                    direction="row"
                    spacing={2}
                    sx={{ p: 2.5, alignItems: 'flex-start' }}
                  >
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 14 }}>
                      {initials(contact)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Button
                        variant="text"
                        sx={{ p: 0, minWidth: 0, fontWeight: 700 }}
                        onClick={() => setActivePanel({ type: 'view-contact', contact })}
                      >
                        {contact.first_name} {contact.last_name}
                      </Button>
                      <Typography variant="body2" color="text.secondary">
                        {[contact.job_title, contact.company_name].filter(Boolean).join(' · ')}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                        {contact.email ? (
                          <IconButton
                            size="small"
                            component="a"
                            href={`mailto:${contact.email}`}
                            aria-label={`Email ${contact.first_name}`}
                          >
                            <MailOutlineRounded fontSize="small" />
                          </IconButton>
                        ) : null}
                        {contact.phone_number ? (
                          <IconButton
                            size="small"
                            component="a"
                            href={`tel:${contact.phone_number}`}
                            aria-label={`Call ${contact.first_name}`}
                          >
                            <PhoneOutlined fontSize="small" />
                          </IconButton>
                        ) : null}
                        {canManage ? (
                          <IconButton
                            size="small"
                            aria-label={`Edit ${contact.first_name}`}
                            onClick={() => setActivePanel({ type: 'edit-contact', contact })}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                    </Box>
                  </Stack>
                ))}
              </Stack>
              <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('crm.contacts.contact')}</TableCell>
                      <TableCell>{t('crm.contacts.company')}</TableCell>
                      <TableCell>{t('crm.contacts.role')}</TableCell>
                      <TableCell>{t('crm.contacts.details')}</TableCell>
                      {canManage ? (
                        <TableCell align="right">{t('crm.contacts.actions')}</TableCell>
                      ) : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((contact) => (
                      <TableRow key={contact.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Avatar
                              sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 12 }}
                            >
                              {initials(contact)}
                            </Avatar>
                            <Box>
                              <Button
                                variant="text"
                                sx={{ p: 0, minWidth: 0, fontWeight: 700 }}
                                onClick={() => setActivePanel({ type: 'view-contact', contact })}
                              >
                                {contact.first_name} {contact.last_name}
                              </Button>
                              {contact.is_primary ? (
                                <Typography
                                  variant="caption"
                                  color="primary.main"
                                  sx={{ display: 'block' }}
                                >
                                  Primary contact
                                </Typography>
                              ) : null}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="text"
                            sx={{ px: 0 }}
                            onClick={() =>
                              setActivePanel({ type: 'view-company', companyId: contact.company })
                            }
                          >
                            {contact.company_name}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{contact.job_title || '—'}</Typography>
                          {contact.department ? (
                            <Typography variant="caption" color="text.secondary">
                              {contact.department}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {contact.email ? (
                            <Link href={`mailto:${contact.email}`} underline="hover">
                              {contact.email}
                            </Link>
                          ) : (
                            '—'
                          )}
                          {contact.phone_number ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 0.35 }}
                            >
                              {contact.phone_number}
                            </Typography>
                          ) : null}
                        </TableCell>
                        {canManage ? (
                          <TableCell align="right">
                            <Tooltip title={t('crm.contacts.edit')}>
                              <IconButton
                                aria-label={`Edit ${contact.first_name} ${contact.last_name}`.trim()}
                                onClick={() => setActivePanel({ type: 'edit-contact', contact })}
                              >
                                <EditRounded />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('crm.contacts.delete')}>
                              <IconButton
                                aria-label={`Delete ${contact.first_name} ${contact.last_name}`.trim()}
                                onClick={() => setActivePanel({ type: 'delete-contact', contact })}
                              >
                                <DeleteOutlineRounded />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      )}
      {activePanel?.type === 'create-contact' ? (
        <ContactDrawer onClose={() => setActivePanel(null)} />
      ) : null}
      {activePanel?.type === 'edit-contact' ? (
        <ContactDrawer contact={activePanel.contact} onClose={() => setActivePanel(null)} />
      ) : null}
      {activePanel?.type === 'view-contact' ? (
        <ContactProfileDrawer
          contact={activePanel.contact}
          onClose={() => setActivePanel(null)}
          onCompany={(companyId) => {
            setActivePanel({ type: 'view-company', companyId })
          }}
        />
      ) : null}
      {routeSearch.contact && routeContact.data ? (
        <ContactProfileDrawer
          contact={routeContact.data}
          onClose={() => void navigate({ search: { contact: undefined } })}
          onCompany={(companyId) => {
            void navigate({ search: { contact: undefined } })
            setActivePanel({ type: 'view-company', companyId })
          }}
        />
      ) : null}
      {routeSearch.contact && (routeContact.isPending || routeContact.isError) ? (
        <Drawer
          anchor="right"
          open
          onClose={() => void navigate({ search: { contact: undefined } })}
          sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 560 }, maxWidth: '100vw' } }}
        >
          {routeContact.isPending ? (
            <Loading />
          ) : (
            <Failure error={routeContact.error} retry={() => void routeContact.refetch()} />
          )}
        </Drawer>
      ) : null}
      {activePanel?.type === 'view-company' ? (
        <CompanyPreviewDrawer
          organizationId={org.id}
          companyId={activePanel.companyId}
          onClose={() => setActivePanel(null)}
        />
      ) : null}
      {query.data ? <ListPagination count={query.count} page={page} onChange={setPage} /> : null}
      <Dialog
        open={activePanel?.type === 'delete-contact'}
        onClose={remove.isPending ? undefined : () => setActivePanel(null)}
      >
        <DialogTitle>{t('crm.contacts.deleteTitle')}</DialogTitle>
        <DialogContent>
          {remove.isError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {remove.error.message}
            </Alert>
          ) : null}
          <Typography>
            {t('crm.contacts.deleteDescription', {
              name:
                activePanel?.type === 'delete-contact'
                  ? `${activePanel.contact.first_name} ${activePanel.contact.last_name}`
                  : '',
            })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setActivePanel(null)} disabled={remove.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => {
              if (activePanel?.type === 'delete-contact') {
                remove.mutate(activePanel.contact.id, { onSuccess: () => setActivePanel(null) })
              }
            }}
          >
            {remove.isPending ? t('crm.contacts.deleting') : t('crm.contacts.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
