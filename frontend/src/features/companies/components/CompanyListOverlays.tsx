import archiveIcon from '@iconify-icons/keyline-icons/archive'
import restoreIcon from '@iconify-icons/keyline-icons/rotate-ccw'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import type { Company, CompanyAssignee } from '../../../types/company.types'
import {
  COMPANY_SORTS,
  COMPANY_SORT_TRANSLATION_KEYS,
  COMPANY_STAGES,
  type CompanyActionsState,
  type CompanyInlineEdit,
  type CompanySort,
} from '../companyListConfig'

function stageLabel(t: TFunction, value: Company['lifecycle_stage']) {
  if (value === 'customer') {
    return t('crm.companies.customerStage')
  }
  return t(`crm.companies.${value}`)
}

interface CompanyFiltersPopoverProps {
  anchor: HTMLElement | null
  stage: Company['lifecycle_stage'] | ''
  owner: string
  ordering: CompanySort
  currentUserId?: number
  assignees: CompanyAssignee[]
  onClose: () => void
  onStageChange: (stage?: Company['lifecycle_stage']) => void
  onOwnerChange: (owner?: string) => void
  onSortChange: (sort?: CompanySort) => void
}

export function CompanyFiltersPopover({
  anchor,
  stage,
  owner,
  ordering,
  currentUserId,
  assignees,
  onClose,
  onStageChange,
  onOwnerChange,
  onSortChange,
}: CompanyFiltersPopoverProps) {
  const { t } = useTranslation()
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: 'calc(100vw - 24px)', sm: 360 },
            maxWidth: 360,
            p: 2,
            mt: 0.75,
          },
        },
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h6">{t('crm.companies.filters')}</Typography>
        <TextField
          select
          label={t('crm.companies.stage')}
          value={stage}
          onChange={(event) =>
            onStageChange(
              (event.target.value || undefined) as Company['lifecycle_stage'] | undefined,
            )
          }
        >
          <MenuItem value="">{t('crm.companies.allStages')}</MenuItem>
          {COMPANY_STAGES.map((item) => (
            <MenuItem key={item} value={item}>
              {stageLabel(t, item)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('crm.companies.ownership')}
          value={owner}
          onChange={(event) => onOwnerChange(event.target.value || undefined)}
        >
          <MenuItem value="">{t('crm.companies.allOwners')}</MenuItem>
          {currentUserId ? (
            <MenuItem value={String(currentUserId)}>{t('crm.companies.mine')}</MenuItem>
          ) : null}
          <MenuItem value="unassigned">{t('crm.companies.unassigned')}</MenuItem>
          {assignees
            .filter((person) => person.id !== currentUserId)
            .map((person) => (
              <MenuItem key={person.id} value={String(person.id)}>
                {person.name}
              </MenuItem>
            ))}
        </TextField>
        <TextField
          select
          label={t('crm.companies.sort')}
          value={ordering}
          onChange={(event) => {
            let nextSort: CompanySort | undefined
            if (event.target.value !== '-updated_at') {
              nextSort = event.target.value as CompanySort
            }
            onSortChange(nextSort)
          }}
        >
          {COMPANY_SORTS.map((item) => (
            <MenuItem key={item} value={item}>
              {t(COMPANY_SORT_TRANSLATION_KEYS[item])}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Popover>
  )
}

interface CompanyInlineEditMenuProps {
  edit: CompanyInlineEdit | null
  assignees: CompanyAssignee[]
  onClose: () => void
  onUpdate: (body: Partial<Pick<Company, 'lifecycle_stage' | 'assigned_to'>>) => void
}

export function CompanyInlineEditMenu({
  edit,
  assignees,
  onClose,
  onUpdate,
}: CompanyInlineEditMenuProps) {
  const { t } = useTranslation()
  return (
    <Menu
      anchorEl={edit?.anchor ?? null}
      open={Boolean(edit)}
      onClose={onClose}
      slotProps={{ paper: { sx: { minWidth: 190, mt: 0.75 } } }}
    >
      {edit?.field === 'stage'
        ? COMPANY_STAGES.map((item) => (
            <MenuItem
              key={item}
              selected={edit.company.lifecycle_stage === item}
              onClick={() => onUpdate({ lifecycle_stage: item })}
            >
              <ListItemText>{stageLabel(t, item)}</ListItemText>
            </MenuItem>
          ))
        : null}
      {edit?.field === 'owner' ? (
        <MenuItem
          selected={edit.company.assigned_to === null}
          onClick={() => onUpdate({ assigned_to: null })}
        >
          <ListItemText>{t('crm.companies.unassigned')}</ListItemText>
        </MenuItem>
      ) : null}
      {edit?.field === 'owner'
        ? assignees.map((member) => (
            <MenuItem
              key={member.id}
              selected={edit.company.assigned_to === member.id}
              onClick={() => onUpdate({ assigned_to: member.id })}
            >
              <ListItemText>{member.name}</ListItemText>
            </MenuItem>
          ))
        : null}
    </Menu>
  )
}

interface CompanyActionsMenuProps {
  state: CompanyActionsState | null
  onClose: () => void
  onEdit: (company: Company) => void
  onArchive: (company: Company) => void
  onRestore: (company: Company) => void
}

export function CompanyActionsMenu({
  state,
  onClose,
  onEdit,
  onArchive,
  onRestore,
}: CompanyActionsMenuProps) {
  const { t } = useTranslation()
  const company = state?.company
  return (
    <Menu anchorEl={state?.anchor ?? null} open={Boolean(state)} onClose={onClose}>
      <MenuItem
        onClick={() => {
          if (company) {
            onEdit(company)
          }
        }}
      >
        <ListItemText>{t('crm.companies.edit')}</ListItemText>
      </MenuItem>
      <MenuItem
        onClick={() => {
          if (!company) {
            return
          }
          if (company.archived_at) {
            onRestore(company)
          } else {
            onArchive(company)
          }
        }}
      >
        <ListItemIcon>
          <AppIcon icon={company?.archived_at ? restoreIcon : archiveIcon} size={18} />
        </ListItemIcon>
        <ListItemText>
          {company?.archived_at ? t('crm.companies.restore') : t('crm.companies.archiveAction')}
        </ListItemText>
      </MenuItem>
    </Menu>
  )
}

interface ArchiveCompanyDialogProps {
  company: Company | null
  pending: boolean
  error: Error | null
  onClose: () => void
  onConfirm: (company: Company) => void
}

export function ArchiveCompanyDialog({
  company,
  pending,
  error,
  onClose,
  onConfirm,
}: ArchiveCompanyDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={Boolean(company)} onClose={pending ? undefined : onClose}>
      <DialogTitle>{t('crm.companies.archiveTitle')}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        ) : null}
        <Typography>{t('crm.companies.archiveDescription', { name: company?.name })}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={pending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={pending}
          onClick={() => {
            if (company) {
              onConfirm(company)
            }
          }}
        >
          {pending ? t('crm.companies.archiving') : t('crm.companies.archive')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
