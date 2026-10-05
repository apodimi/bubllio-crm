import { useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import { Box, Button, Chip, Drawer, IconButton, Stack, Typography } from '@mui/material'
import { Link } from '@tanstack/react-router'
import { Failure, Loading } from '../../../components/common/Feedback'
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
  const [editing, setEditing] = useState(false)
  const company = useCompany(organizationId, companyId)
  const contacts = useContacts(organizationId)
  const companyContacts = (contacts.data ?? []).filter((contact) => contact.company === companyId)

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
                  <Chip size="small" label={company.data.lifecycle_stage} variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    {companyContacts.length} {companyContacts.length === 1 ? 'contact' : 'contacts'}
                  </Typography>
                </Stack>
                <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
                  {company.data.name}
                </Typography>
              </Box>
              <IconButton aria-label="Close company preview" onClick={onClose}>
                <CloseRounded />
              </IconButton>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2.5 }}>
              <Button
                variant="contained"
                startIcon={<EditRounded />}
                onClick={() => setEditing(true)}
              >
                Edit company
              </Button>
              <Link
                to="/organizations/$organizationId/companies/$companyId"
                params={{ organizationId, companyId: company.data.customer_code }}
              >
                <Button component="span" variant="outlined" startIcon={<OpenInNewRounded />}>
                  Open full profile
                </Button>
              </Link>
            </Stack>
          </Box>
          <Box sx={{ px: { xs: 2.5, sm: 4 }, py: 4, overflowY: 'auto' }}>
            <CompanyProfileContent company={company.data} />
          </Box>
        </>
      )}
      {editing && company.data ? (
        <CompanyDialog
          organizationId={organizationId}
          company={company.data}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </Drawer>
  )
}
