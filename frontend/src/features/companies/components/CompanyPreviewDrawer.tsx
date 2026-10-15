import { useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import { Box, Button, Chip, Drawer, IconButton, Stack, Typography } from '@mui/material'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Failure, Loading } from '../../../components/common/Feedback'
import { canCreateRecords, useWorkspace } from '../../organizations'
import { useContacts } from '../../contacts'
import { useCompany } from '../hooks/useCompanies'
import { CompanyProfileContent } from './CompanyProfileContent'
import { CompanyDialog } from './CompanyDialog'

export function CompanyPreviewDrawer({
  organizationId,
  companyId,
  onClose,
}: {
  organizationId: string
  companyId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const workspace = useWorkspace()
  const canManage = workspace.id === organizationId && canCreateRecords(workspace)
  const [editing, setEditing] = useState(false)
  const company = useCompany(organizationId, companyId)
  const contacts = useContacts(organizationId, { company: company.data?.id ?? '' })
  const companyContacts = contacts.data ?? []

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 560 },
          maxWidth: '100vw',
          bgcolor: 'background.default',
        },
      }}
    >
      {company.isPending ? (
        <Loading />
      ) : company.isError ? (
        <Box sx={{ p: 3 }}>
          <Failure error={company.error} retry={() => void company.refetch()} />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              px: { xs: 2.5, sm: 4 },
              py: 2.5,
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                  <Chip
                    size="small"
                    label={t(`crm.companies.stages.${company.data.lifecycle_stage}`)}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t('crm.companies.preview.contactCount', {
                      count: companyContacts.length,
                    })}
                  </Typography>
                </Stack>
                <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
                  {company.data.name}
                </Typography>
              </Box>
              <IconButton aria-label={t('crm.companies.preview.close')} onClick={onClose}>
                <CloseRounded />
              </IconButton>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2.5 }}>
              {canManage ? (
                <Button
                  variant="contained"
                  startIcon={<EditRounded />}
                  onClick={() => setEditing(true)}
                >
                  {t('crm.companies.edit')}
                </Button>
              ) : null}
              <Link
                to="/organizations/$organizationId/companies/$companyId"
                params={{ organizationId, companyId: company.data.customer_code }}
              >
                <Button component="span" variant="outlined" startIcon={<OpenInNewRounded />}>
                  {t('crm.companies.preview.openFullProfile')}
                </Button>
              </Link>
            </Stack>
          </Box>
          <Box sx={{ px: { xs: 2.5, sm: 4 }, py: 4, overflowY: 'auto' }}>
            <CompanyProfileContent company={company.data} />
          </Box>
        </>
      )}
      {canManage && editing && company.data ? (
        <CompanyDialog
          organizationId={organizationId}
          company={company.data}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </Drawer>
  )
}
