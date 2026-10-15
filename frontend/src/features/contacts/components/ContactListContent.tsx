import type { ReactNode } from 'react'
import moreHorizontal from '@iconify-icons/keyline-icons/more-horizontal'
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  IconButton,
  Link,
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

import { AppIcon } from '../../../components/common/AppIcon'
import { Failure } from '../../../components/common/Feedback'
import type { Contact } from '../../../types/contact.types'

interface ContactListContentProps {
  rows: Contact[]
  canManage: boolean
  hasFilters: boolean
  hasCompanies: boolean
  isPending: boolean
  isError: boolean
  error: Error | null
  emptyAction: ReactNode
  onRetry: () => void
  onOpenContact: (contact: Contact) => void
  onOpenCompany: (companyId: string) => void
  onOpenActions: (anchor: HTMLElement, contact: Contact) => void
}

const contactName = (contact: Contact) => `${contact.first_name} ${contact.last_name}`.trim()

const initials = (contact: Contact) =>
  `${contact.first_name[0] ?? ''}${contact.last_name[0] ?? ''}`.toUpperCase()

function ContactListSkeleton() {
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
                md: 'minmax(220px, 1.6fr) minmax(150px, 1fr) minmax(140px, 1fr) minmax(130px, .9fr) minmax(190px, 1.3fr) 48px',
              },
              alignItems: 'center',
              gap: 2,
              minHeight: { xs: 104, md: 68 },
              px: 2,
            }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Skeleton variant="circular" width={34} height={34} />
              <Stack spacing={0.25} sx={{ flex: 1 }}>
                <Skeleton width="58%" height={20} />
                <Skeleton width="74%" height={16} />
              </Stack>
            </Stack>
            {Array.from({ length: 4 }, (_, item) => (
              <Skeleton
                key={item}
                width={item === 3 ? '78%' : '62%'}
                height={18}
                sx={{ display: { xs: 'none', md: 'block' } }}
              />
            ))}
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

function ContactMobileList({
  rows,
  canManage,
  onOpenContact,
  onOpenActions,
}: Pick<ContactListContentProps, 'rows' | 'canManage' | 'onOpenContact' | 'onOpenActions'>) {
  const { t } = useTranslation()
  return (
    <Stack
      divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}
      sx={{ display: { xs: 'flex', md: 'none' } }}
    >
      {rows.map((contact) => {
        const name = contactName(contact)
        return (
          <Box
            key={contact.id}
            sx={{ display: 'grid', gridTemplateColumns: canManage ? 'minmax(0, 1fr) 48px' : '1fr' }}
          >
            <ButtonBase
              aria-label={t('crm.contacts.openContact', { name })}
              onClick={() => onOpenContact(contact)}
              sx={{
                minWidth: 0,
                minHeight: 104,
                px: 2,
                py: 1.5,
                textAlign: 'left',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
              }}
            >
              <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, width: '100%' }}>
                <Avatar sx={{ width: 36, height: 36, fontSize: 12 }}>{initials(contact)}</Avatar>
                <Stack spacing={0.4} sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 700 }}>
                      {name}
                    </Typography>
                    {contact.is_primary ? (
                      <Typography variant="caption" color="primary.main" sx={{ flexShrink: 0 }}>
                        {t('crm.contacts.primaryShort')}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {[contact.job_title, contact.company_name].filter(Boolean).join(' · ') || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {contact.email || contact.phone_number || t('crm.contacts.noContactDetails')}
                  </Typography>
                </Stack>
              </Stack>
            </ButtonBase>
            {canManage ? (
              <IconButton
                aria-label={t('crm.contacts.moreActions', { name })}
                onClick={(event) => onOpenActions(event.currentTarget, contact)}
                sx={{ alignSelf: 'center', justifySelf: 'center' }}
              >
                <AppIcon icon={moreHorizontal} />
              </IconButton>
            ) : null}
          </Box>
        )
      })}
    </Stack>
  )
}

function ContactDesktopTable({
  rows,
  canManage,
  onOpenContact,
  onOpenCompany,
  onOpenActions,
}: Pick<
  ContactListContentProps,
  'rows' | 'canManage' | 'onOpenContact' | 'onOpenCompany' | 'onOpenActions'
>) {
  const { t } = useTranslation()
  return (
    <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
      <Table sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: canManage ? '26%' : '28%' }}>
              {t('crm.contacts.contact')}
            </TableCell>
            <TableCell sx={{ width: '18%' }}>{t('crm.contacts.company')}</TableCell>
            <TableCell sx={{ width: '17%' }}>{t('crm.contacts.role')}</TableCell>
            <TableCell sx={{ width: '15%' }}>{t('crm.contacts.owner')}</TableCell>
            <TableCell sx={{ width: canManage ? '19%' : '22%' }}>
              {t('crm.contacts.details')}
            </TableCell>
            {canManage ? <TableCell align="right" sx={{ width: '5%' }} /> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((contact) => {
            const name = contactName(contact)
            return (
              <TableRow key={contact.id} hover sx={{ '& > *': { py: 1.5 } }}>
                <TableCell>
                  <ButtonBase
                    aria-label={t('crm.contacts.openContact', { name })}
                    onClick={() => onOpenContact(contact)}
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      borderRadius: 1,
                      py: 0.5,
                    }}
                  >
                    <Avatar sx={{ width: 34, height: 34, mr: 1.25, fontSize: 12 }}>
                      {initials(contact)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <Typography noWrap sx={{ fontWeight: 700 }}>
                          {name}
                        </Typography>
                        {contact.is_primary ? (
                          <Typography variant="caption" color="primary.main" sx={{ flexShrink: 0 }}>
                            {t('crm.contacts.primaryShort')}
                          </Typography>
                        ) : null}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contact.status === 'former'
                          ? t('crm.contacts.former')
                          : contact.archived_at
                            ? t('crm.contacts.archivedSingle')
                            : t('crm.contacts.activeSingle')}
                      </Typography>
                    </Box>
                  </ButtonBase>
                </TableCell>
                <TableCell>
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => onOpenCompany(contact.company)}
                    sx={{ minWidth: 0, maxWidth: '100%', px: 0.5, justifyContent: 'flex-start' }}
                  >
                    <Typography variant="body2" noWrap>
                      {contact.company_name}
                    </Typography>
                  </Button>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap>
                    {contact.job_title || '—'}
                  </Typography>
                  {contact.department ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ display: 'block' }}
                    >
                      {contact.department}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: 10 }}>
                      {contact.assigned_to_name?.slice(0, 1).toUpperCase() || '–'}
                    </Avatar>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {contact.assigned_to_name || t('crm.contacts.unassigned')}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  {contact.email ? (
                    <Link href={`mailto:${contact.email}`} underline="hover" variant="body2" noWrap>
                      {contact.email}
                    </Link>
                  ) : (
                    <Typography variant="body2">—</Typography>
                  )}
                  {contact.phone_number ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ display: 'block' }}
                    >
                      {contact.phone_number}
                    </Typography>
                  ) : null}
                </TableCell>
                {canManage ? (
                  <TableCell align="right">
                    <Tooltip title={t('crm.contacts.moreActions', { name })}>
                      <IconButton
                        aria-label={t('crm.contacts.moreActions', { name })}
                        onClick={(event) => onOpenActions(event.currentTarget, contact)}
                      >
                        <AppIcon icon={moreHorizontal} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export function ContactListContent(props: ContactListContentProps) {
  const { t } = useTranslation()
  if (props.isPending) return <ContactListSkeleton />
  if (props.isError && props.error) {
    return (
      <Box sx={{ p: 2 }}>
        <Failure error={props.error} retry={props.onRetry} />
      </Box>
    )
  }
  if (props.rows.length === 0) {
    const title = props.hasFilters ? t('crm.contacts.noMatches') : t('crm.contacts.empty')
    const description = props.hasFilters
      ? t('crm.contacts.noMatchesDescription')
      : props.hasCompanies
        ? t('crm.contacts.emptyDescription')
        : t('crm.contacts.createCompanyFirst')
    return (
      <Stack
        spacing={1.5}
        sx={{ px: 3, py: { xs: 5, md: 7 }, textAlign: 'center', alignItems: 'center' }}
      >
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '65ch' }}>
          {description}
        </Typography>
        {props.emptyAction}
      </Stack>
    )
  }

  return (
    <>
      <ContactMobileList {...props} />
      <ContactDesktopTable {...props} />
    </>
  )
}
