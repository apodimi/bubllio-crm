import type { MouseEvent, ReactNode } from 'react'
import chevronDown from '@iconify-icons/keyline-icons/chevron-down'
import moreHorizontal from '@iconify-icons/keyline-icons/more-horizontal'
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { AppIcon } from '../../../components/common/AppIcon'
import { Failure } from '../../../components/common/Feedback'
import type { Company } from '../../../types/company.types'

interface CompanyListContentProps {
  rows: Company[]
  canManage: boolean
  hasFilters: boolean
  isPending: boolean
  isError: boolean
  error: Error | null
  quickUpdatePending: boolean
  dateFormatter: Intl.DateTimeFormat
  emptyAction: ReactNode
  onRetry: () => void
  onOpenCompany: (company: Company) => void
  onEditOwner: (event: MouseEvent<HTMLElement>, company: Company) => void
  onEditStage: (event: MouseEvent<HTMLElement>, company: Company) => void
  onOpenActions: (anchor: HTMLElement, company: Company) => void
}

function stageLabel(t: TFunction, value: Company['lifecycle_stage']) {
  if (value === 'customer') {
    return t('crm.companies.customerStage')
  }
  return t(`crm.companies.${value}`)
}

function CompanyListSkeleton() {
  const { t } = useTranslation()
  return (
    <Box role="status" aria-label={t('common.loading')}>
      <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
        {Array.from({ length: 5 }, (_, index) => (
          <Box
            key={index}
            aria-hidden="true"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'minmax(0, 2fr) minmax(160px, 1fr) minmax(120px, .8fr) 120px 120px 48px',
              },
              alignItems: 'center',
              gap: 2,
              minHeight: { xs: 108, sm: 68 },
              px: 2,
            }}
          >
            <Stack spacing={0.5}>
              <Skeleton width="56%" height={22} />
              <Skeleton width="74%" height={16} />
            </Stack>
            <Skeleton width="72%" height={26} sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Skeleton width="60%" height={18} sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Skeleton width="60%" height={18} sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Skeleton width="74%" height={18} sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Skeleton
              variant="rounded"
              width={32}
              height={32}
              sx={{ display: { xs: 'none', sm: 'block' } }}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

function CompanyMobileList({
  rows,
  canManage,
  dateFormatter,
  onOpenCompany,
  onOpenActions,
}: Pick<
  CompanyListContentProps,
  'rows' | 'canManage' | 'dateFormatter' | 'onOpenCompany' | 'onOpenActions'
>) {
  const { t } = useTranslation()
  return (
    <Stack
      divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}
      sx={{ display: { xs: 'flex', sm: 'none' } }}
    >
      {rows.map((company) => (
        <Box
          key={company.id}
          sx={{ display: 'grid', gridTemplateColumns: canManage ? 'minmax(0, 1fr) 48px' : '1fr' }}
        >
          <ButtonBase
            onClick={() => onOpenCompany(company)}
            aria-label={t('crm.companies.openCompany', { name: company.name })}
            sx={{
              minWidth: 0,
              minHeight: 108,
              px: 2,
              py: 1.5,
              textAlign: 'left',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
            }}
          >
            <Stack spacing={0.75} sx={{ minWidth: 0, width: '100%' }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'space-between', alignItems: 'baseline', minWidth: 0 }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {company.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                >
                  {company.customer_code}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Avatar sx={{ width: 22, height: 22, fontSize: 10 }}>
                  {company.assigned_to_name?.slice(0, 1).toUpperCase() || '–'}
                </Avatar>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {company.assigned_to_name || t('crm.companies.unassigned')}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={stageLabel(t, company.lifecycle_stage)}
                  sx={{ ml: 'auto', borderRadius: 1 }}
                />
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t('crm.companies.updated', {
                  date: dateFormatter.format(new Date(company.updated_at)),
                })}
              </Typography>
            </Stack>
          </ButtonBase>
          {canManage ? (
            <IconButton
              aria-label={t('crm.companies.moreActions', { name: company.name })}
              onClick={(event) => onOpenActions(event.currentTarget, company)}
              sx={{ alignSelf: 'center', justifySelf: 'center' }}
            >
              <AppIcon icon={moreHorizontal} />
            </IconButton>
          ) : null}
        </Box>
      ))}
    </Stack>
  )
}

function CompanyDesktopTable({
  rows,
  canManage,
  quickUpdatePending,
  dateFormatter,
  onOpenCompany,
  onEditOwner,
  onEditStage,
  onOpenActions,
}: Pick<
  CompanyListContentProps,
  | 'rows'
  | 'canManage'
  | 'quickUpdatePending'
  | 'dateFormatter'
  | 'onOpenCompany'
  | 'onEditOwner'
  | 'onEditStage'
  | 'onOpenActions'
>) {
  const { t } = useTranslation()
  return (
    <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
      <Table sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: canManage ? '34%' : '38%' }}>
              {t('crm.companies.company')}
            </TableCell>
            <TableCell sx={{ width: canManage ? '18%' : '20%' }}>
              {t('crm.companies.ownership')}
            </TableCell>
            <TableCell sx={{ width: '16%' }}>{t('crm.companies.stage')}</TableCell>
            <TableCell sx={{ width: '14%' }}>{t('crm.companies.location')}</TableCell>
            <TableCell sx={{ width: canManage ? '13%' : '12%' }}>
              {t('crm.companies.updatedColumn')}
            </TableCell>
            {canManage ? (
              <TableCell
                align="right"
                aria-label={t('crm.companies.actions')}
                sx={{ width: '5%' }}
              />
            ) : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((company) => (
            <TableRow
              key={company.id}
              hover
              aria-label={t('crm.companies.openCompany', { name: company.name })}
              sx={{ '& > *': { py: 1.5 } }}
            >
              <TableCell>
                <ButtonBase
                  onClick={() => onOpenCompany(company)}
                  aria-label={t('crm.companies.openCompany', { name: company.name })}
                  sx={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 1,
                    py: 0.5,
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>{company.name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {company.customer_code} ·{' '}
                    {company.email || company.phone_number || t('crm.companies.noContact')}
                  </Typography>
                </ButtonBase>
              </TableCell>
              <TableCell>
                {canManage ? (
                  <Button
                    size="small"
                    color="inherit"
                    endIcon={<AppIcon icon={chevronDown} size={15} />}
                    disabled={quickUpdatePending}
                    onClick={(event) => onEditOwner(event, company)}
                    sx={{
                      minWidth: 0,
                      maxWidth: '100%',
                      px: 0.5,
                      justifyContent: 'flex-start',
                      color: company.assigned_to_name ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    <Avatar sx={{ width: 22, height: 22, mr: 0.75, fontSize: 10 }}>
                      {company.assigned_to_name?.slice(0, 1).toUpperCase() || '–'}
                    </Avatar>
                    <Typography component="span" variant="body2" noWrap>
                      {company.assigned_to_name || t('crm.companies.unassigned')}
                    </Typography>
                  </Button>
                ) : (
                  <Typography variant="body2" noWrap>
                    {company.assigned_to_name || t('crm.companies.unassigned')}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <Button
                    size="small"
                    color={company.lifecycle_stage === 'customer' ? 'primary' : 'inherit'}
                    endIcon={<AppIcon icon={chevronDown} size={15} />}
                    disabled={quickUpdatePending}
                    aria-label={`${t('crm.companies.stage')}: ${company.name}`}
                    onClick={(event) => onEditStage(event, company)}
                    sx={{ minWidth: 0, px: 0.5 }}
                  >
                    {stageLabel(t, company.lifecycle_stage)}
                  </Button>
                ) : (
                  <Typography variant="body2">{stageLabel(t, company.lifecycle_stage)}</Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {[company.city, company.country].filter(Boolean).join(', ') || '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {dateFormatter.format(new Date(company.updated_at))}
                </Typography>
              </TableCell>
              {canManage ? (
                <TableCell align="right">
                  <Tooltip title={t('crm.companies.moreActions', { name: company.name })}>
                    <IconButton
                      aria-label={t('crm.companies.moreActions', { name: company.name })}
                      onClick={(event) => onOpenActions(event.currentTarget, company)}
                    >
                      <AppIcon icon={moreHorizontal} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export function CompanyListContent(props: CompanyListContentProps) {
  const { t } = useTranslation()
  if (props.isPending) {
    return <CompanyListSkeleton />
  }
  if (props.isError && props.error) {
    return (
      <Box sx={{ p: 2 }}>
        <Failure error={props.error} retry={props.onRetry} />
      </Box>
    )
  }
  if (props.rows.length === 0) {
    return (
      <Stack
        spacing={1.5}
        sx={{ px: 3, py: { xs: 5, md: 7 }, textAlign: 'center', alignItems: 'center' }}
      >
        <Typography variant="h6">
          {props.hasFilters ? t('crm.companies.noMatches') : t('crm.companies.empty')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '65ch' }}>
          {props.hasFilters
            ? t('crm.companies.noMatchesDescription')
            : t('crm.companies.emptyDescription')}
        </Typography>
        {props.emptyAction}
      </Stack>
    )
  }

  return (
    <>
      <CompanyMobileList {...props} />
      <CompanyDesktopTable {...props} />
    </>
  )
}
