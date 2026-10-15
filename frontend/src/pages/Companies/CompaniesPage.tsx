import type { ReactNode } from 'react'
import plusIcon from '@iconify-icons/keyline-icons/plus'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { ListPagination } from '../../components/common/ListPagination'
import {
  ActiveCompanyFilters,
  CompanyListToolbar,
  CompanyViewTabs,
} from '../../features/companies/components/CompanyListControls'
import { CompanyListContent } from '../../features/companies/components/CompanyListContent'
import {
  ArchiveCompanyDialog,
  CompanyActionsMenu,
  CompanyFiltersPopover,
  CompanyInlineEditMenu,
} from '../../features/companies/components/CompanyListOverlays'
import { CompanyDialog } from '../../features/companies/components/CompanyDialog'
import { CompanyPreviewDrawer } from '../../features/companies/components/CompanyPreviewDrawer'
import { useCompanyListController } from '../../features/companies/hooks/useCompanyListController'

export function CompaniesPage() {
  const { t } = useTranslation()
  const {
    org,
    routeSearch,
    currentUserId,
    canManage,
    view,
    stage,
    owner,
    ordering,
    page,
    search,
    query,
    rows,
    dateFormatter,
    advancedFilterCount,
    hasFilters,
    create,
    editing,
    archiving,
    filtersAnchor,
    inlineEdit,
    actionsMenu,
    archive,
    restore,
    quickUpdate,
    assignees,
    updateSearch,
    clearFilters,
    selectView,
    openInlineEdit,
    updateInline,
    ownerLabel,
    changeOwner,
    closeCreate,
    setCreate,
    setEditing,
    setArchiving,
    setFiltersAnchor,
    setInlineEdit,
    setActionsMenu,
  } = useCompanyListController()

  let emptyAction: ReactNode = null
  if (hasFilters) {
    emptyAction = (
      <Button variant="outlined" onClick={clearFilters}>
        {t('crm.companies.noMatchesAction')}
      </Button>
    )
  } else if (canManage) {
    emptyAction = (
      <Button
        variant="contained"
        startIcon={<AppIcon icon={plusIcon} />}
        onClick={() => setCreate(true)}
      >
        {t('crm.companies.noDataAction')}
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
              {t('crm.companies.title')}
            </Typography>
            {!query.isPending ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t('crm.companies.count', { count: query.count })}
              </Typography>
            ) : null}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: '60ch' }}>
            {t('crm.companies.description')}
          </Typography>
        </Box>
        {canManage ? (
          <Button
            variant="contained"
            startIcon={<AppIcon icon={plusIcon} />}
            aria-label={t('crm.companies.add')}
            onClick={() => setCreate(true)}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            {t('crm.companies.add')}
          </Button>
        ) : null}
      </Stack>

      <Box component="section" aria-label={t('crm.companies.title')} sx={{ minWidth: 0 }}>
        <CompanyViewTabs currentUserId={currentUserId} value={view} onChange={selectView} />
        <CompanyListToolbar
          search={search}
          advancedFilterCount={advancedFilterCount}
          filtersOpen={Boolean(filtersAnchor)}
          onSearchChange={(value) => updateSearch({ q: value || undefined, page: undefined })}
          onOpenFilters={setFiltersAnchor}
        />

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <ActiveCompanyFilters
            stage={stage}
            owner={owner}
            ordering={ordering}
            hasExplicitSort={Boolean(routeSearch.sort)}
            ownerLabel={ownerLabel}
            onClearStage={() => updateSearch({ stage: undefined, page: undefined })}
            onClearOwner={() => updateSearch({ owner: undefined, page: undefined })}
            onClearSort={() => updateSearch({ sort: undefined, page: undefined })}
            onClearAll={clearFilters}
          />
          {quickUpdate.isError || restore.isError ? (
            <Alert severity="error" sx={{ borderRadius: 0 }}>
              {(quickUpdate.error || restore.error)?.message}
            </Alert>
          ) : null}
          <CompanyListContent
            rows={rows}
            canManage={canManage}
            hasFilters={hasFilters}
            isPending={query.isPending}
            isError={query.isError}
            error={query.error}
            quickUpdatePending={quickUpdate.isPending}
            dateFormatter={dateFormatter}
            emptyAction={emptyAction}
            onRetry={() => void query.refetch()}
            onOpenCompany={(company) => updateSearch({ company: company.customer_code })}
            onEditOwner={(event, company) => openInlineEdit(event, company, 'owner')}
            onEditStage={(event, company) => openInlineEdit(event, company, 'stage')}
            onOpenActions={(anchor, company) => setActionsMenu({ anchor, company })}
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

      <CompanyFiltersPopover
        anchor={filtersAnchor}
        stage={stage}
        owner={owner}
        ordering={ordering}
        currentUserId={currentUserId}
        assignees={assignees.data ?? []}
        onClose={() => setFiltersAnchor(null)}
        onStageChange={(nextStage) => updateSearch({ stage: nextStage, page: undefined })}
        onOwnerChange={changeOwner}
        onSortChange={(nextSort) => updateSearch({ sort: nextSort, page: undefined })}
      />
      <CompanyInlineEditMenu
        edit={inlineEdit}
        assignees={assignees.data ?? []}
        onClose={() => setInlineEdit(null)}
        onUpdate={updateInline}
      />
      <CompanyActionsMenu
        state={actionsMenu}
        onClose={() => setActionsMenu(null)}
        onEdit={(company) => {
          setEditing(company)
          setActionsMenu(null)
        }}
        onArchive={(company) => {
          setArchiving(company)
          setActionsMenu(null)
        }}
        onRestore={(company) => {
          setActionsMenu(null)
          restore.mutate(company.id)
        }}
      />

      {create ? <CompanyDialog organizationId={org.id} onClose={closeCreate} /> : null}
      {editing ? (
        <CompanyDialog organizationId={org.id} company={editing} onClose={() => setEditing(null)} />
      ) : null}
      {routeSearch.company ? (
        <CompanyPreviewDrawer
          organizationId={org.id}
          companyId={routeSearch.company}
          onClose={() => updateSearch({ company: undefined })}
        />
      ) : null}

      <ArchiveCompanyDialog
        company={archiving}
        pending={archive.isPending}
        error={archive.error}
        onClose={() => setArchiving(null)}
        onConfirm={(company) => archive.mutate(company.id, { onSuccess: () => setArchiving(null) })}
      />
    </>
  )
}
