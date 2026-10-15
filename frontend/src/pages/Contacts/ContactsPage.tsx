import type { ReactNode } from 'react'
import plusIcon from '@iconify-icons/keyline-icons/plus'
import { Alert, Box, Button, Drawer, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { Failure, Loading } from '../../components/common/Feedback'
import { ListPagination } from '../../components/common/ListPagination'
import { CompanyPreviewDrawer } from '../../features/companies/components/CompanyPreviewDrawer'
import { ContactDrawer } from '../../features/contacts/components/ContactDrawer'
import { ContactListContent } from '../../features/contacts/components/ContactListContent'
import {
  ActiveContactFilters,
  ContactFiltersPopover,
  ContactListToolbar,
  ContactViewTabs,
} from '../../features/contacts/components/ContactListControls'
import {
  ContactActionsMenu,
  DeleteContactDialog,
} from '../../features/contacts/components/ContactListOverlays'
import { ContactProfileDrawer } from '../../features/contacts/components/ContactProfileDrawer'
import { useContactListController } from '../../features/contacts/hooks/useContactListController'

export function ContactsPage() {
  const { t } = useTranslation()
  const {
    org,
    routeSearch,
    canManage,
    view,
    search,
    company,
    companyName,
    page,
    query,
    rows,
    companies,
    routeContact,
    archive,
    restore,
    remove,
    hasFilters,
    editing,
    companyPreview,
    deleting,
    filtersAnchor,
    actionsMenu,
    error,
    updateSearch,
    clearFilters,
    selectView,
    closeCreate,
    closeActions,
    runArchive,
    runRestore,
    setEditing,
    setCompanyPreview,
    setDeleting,
    setFiltersAnchor,
    setActionsMenu,
  } = useContactListController()

  let emptyAction: ReactNode = null
  if (hasFilters) {
    emptyAction = (
      <Button variant="outlined" onClick={clearFilters}>
        {t('crm.contacts.noMatchesAction')}
      </Button>
    )
  } else if (canManage && companies.data?.length) {
    emptyAction = (
      <Button
        variant="contained"
        startIcon={<AppIcon icon={plusIcon} />}
        onClick={() => updateSearch({ create: true })}
      >
        {t('crm.contacts.add')}
      </Button>
    )
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Typography variant="h2" component="h1">
              {t('crm.contacts.title')}
            </Typography>
            {!query.isPending ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t('crm.contacts.count', { count: query.count })}
              </Typography>
            ) : null}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: '60ch' }}>
            {t('crm.contacts.description')}
          </Typography>
        </Box>
        {canManage ? (
          <Button
            variant="contained"
            startIcon={<AppIcon icon={plusIcon} />}
            disabled={!companies.data?.length}
            onClick={() => updateSearch({ create: true })}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            {t('crm.contacts.add')}
          </Button>
        ) : null}
      </Stack>

      <Box component="section" aria-label={t('crm.contacts.title')} sx={{ minWidth: 0 }}>
        <ContactViewTabs value={view} onChange={selectView} />
        <ContactListToolbar
          search={search}
          filterCount={Number(Boolean(company))}
          filtersOpen={Boolean(filtersAnchor)}
          onSearchChange={(value) => updateSearch({ q: value || undefined, page: undefined })}
          onOpenFilters={setFiltersAnchor}
        />

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <ActiveContactFilters
            company={company}
            companyName={companyName}
            onClearCompany={() => updateSearch({ company: undefined, page: undefined })}
            onClearAll={clearFilters}
          />
          {archive.isError || restore.isError ? (
            <Alert severity="error" sx={{ borderRadius: 0 }}>
              {(archive.error || restore.error)?.message}
            </Alert>
          ) : null}
          <ContactListContent
            rows={rows}
            canManage={canManage}
            hasFilters={hasFilters}
            hasCompanies={Boolean(companies.data?.length)}
            isPending={query.isPending || companies.isPending}
            isError={Boolean(error)}
            error={error}
            emptyAction={emptyAction}
            onRetry={() => {
              void query.refetch()
              void companies.refetch()
            }}
            onOpenContact={(contact) => updateSearch({ contact: contact.id })}
            onOpenCompany={setCompanyPreview}
            onOpenActions={(anchor, contact) => setActionsMenu({ anchor, contact })}
          />
        </Paper>
      </Box>

      {query.data ? (
        <ListPagination
          count={query.count}
          page={page - 1}
          onChange={(nextPage) => updateSearch({ page: nextPage ? nextPage + 1 : undefined })}
        />
      ) : null}

      <ContactFiltersPopover
        anchor={filtersAnchor}
        company={company}
        companies={companies.data ?? []}
        onClose={() => setFiltersAnchor(null)}
        onCompanyChange={(nextCompany) => updateSearch({ company: nextCompany, page: undefined })}
      />
      <ContactActionsMenu
        state={actionsMenu}
        archivePending={archive.isPending || restore.isPending}
        onClose={closeActions}
        onEdit={(contact) => {
          setEditing(contact)
          closeActions()
        }}
        onArchive={runArchive}
        onRestore={runRestore}
        onDelete={(contact) => {
          setDeleting(contact)
          closeActions()
        }}
      />

      {routeSearch.create ? <ContactDrawer onClose={closeCreate} /> : null}
      {editing ? <ContactDrawer contact={editing} onClose={() => setEditing(null)} /> : null}
      {routeSearch.contact && routeContact.data ? (
        <ContactProfileDrawer
          contact={routeContact.data}
          onClose={() => updateSearch({ contact: undefined })}
          onCompany={(companyId) => {
            updateSearch({ contact: undefined })
            setCompanyPreview(companyId)
          }}
        />
      ) : null}
      {routeSearch.contact && (routeContact.isPending || routeContact.isError) ? (
        <Drawer
          anchor="right"
          open
          onClose={() => updateSearch({ contact: undefined })}
          sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 560 }, maxWidth: '100vw' } }}
        >
          {routeContact.isPending ? (
            <Loading />
          ) : (
            <Failure error={routeContact.error} retry={() => void routeContact.refetch()} />
          )}
        </Drawer>
      ) : null}
      {companyPreview ? (
        <CompanyPreviewDrawer
          organizationId={org.id}
          companyId={companyPreview}
          onClose={() => setCompanyPreview(null)}
        />
      ) : null}

      <DeleteContactDialog
        contact={deleting}
        pending={remove.isPending}
        error={remove.error}
        onClose={() => setDeleting(null)}
        onConfirm={(contact) => remove.mutate(contact.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}
