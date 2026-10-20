import editIcon from '@iconify-icons/keyline-icons/pen'
import plusIcon from '@iconify-icons/keyline-icons/plus'
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../../components/common/AppIcon'
import { Empty, Failure, Loading, PageHeading } from '../../components/common/Feedback'
import {
  CollaboratorDrawer,
  CollaboratorServiceDrawer,
} from '../../features/costing/components/CostingDrawers'
import { useCollaborators, useCollaboratorServices } from '../../features/costing'
import { canCreateRecords, useWorkspace } from '../../features/organizations'
import type { Collaborator, CollaboratorService } from '../../types/costing.types'

export function CollaboratorsPage() {
  const { t, i18n } = useTranslation()
  const workspace = useWorkspace()
  const canManage = canCreateRecords(workspace)
  const collaborators = useCollaborators(workspace.id)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Collaborator | true | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(
    () => (collaborators.data ?? []).find((item) => item.id === selectedId) ?? null,
    [collaborators.data, selectedId],
  )
  const services = useCollaboratorServices(workspace.id, selected?.id, Boolean(selected))
  const [serviceEditor, setServiceEditor] = useState<CollaboratorService | true | null>(null)
  const rows = useMemo(
    () =>
      (collaborators.data ?? []).filter((item) =>
        `${item.name} ${item.specialty}`
          .toLocaleLowerCase(i18n.language)
          .includes(query.trim().toLocaleLowerCase(i18n.language)),
      ),
    [collaborators.data, i18n.language, query],
  )
  const money = (amount: string, currency: string) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(Number(amount))

  return (
    <>
      <PageHeading
        title={t('crm.costing.title')}
        description={t('crm.costing.description')}
        action={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<AppIcon icon={plusIcon} />}
              onClick={() => setEditor(true)}
            >
              {t('crm.costing.newCollaborator')}
            </Button>
          ) : null
        }
      />
      {!canManage ? (
        <Box sx={{ mb: 2 }}>
          <Typography color="text.secondary">{t('crm.costing.readOnly')}</Typography>
        </Box>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: selected ? 'minmax(280px,.8fr) minmax(0,1.2fr)' : '1fr',
          },
          gap: 3,
        }}
      >
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              label={t('crm.costing.search')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Box>
          <Divider />
          {collaborators.isPending ? (
            <Box sx={{ p: 3 }}>
              <Loading />
            </Box>
          ) : collaborators.isError ? (
            <Box sx={{ p: 3 }}>
              <Failure error={collaborators.error} retry={() => void collaborators.refetch()} />
            </Box>
          ) : rows.length === 0 ? (
            <Empty
              title={t('crm.costing.emptyTitle')}
              description={t('crm.costing.emptyDescription')}
            />
          ) : (
            <Stack divider={<Divider />}>
              {rows.map((item) => (
                <Button
                  key={item.id}
                  color="inherit"
                  fullWidth
                  onClick={() => setSelectedId(item.id)}
                  sx={{
                    borderRadius: 0,
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    px: 2.5,
                    py: 2,
                    bgcolor: selected?.id === item.id ? 'action.selected' : undefined,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.specialty || t('crm.costing.noSpecialty')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {!item.is_active ? (
                      <Chip size="small" label={t('crm.costing.inactive')} variant="outlined" />
                    ) : null}
                    {canManage ? (
                      <Tooltip title={t('common.edit')}>
                        <IconButton
                          component="span"
                          aria-label={t('crm.costing.editCollaborator')}
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditor(item)
                          }}
                        >
                          <AppIcon icon={editIcon} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </Stack>
                </Button>
              ))}
            </Stack>
          )}
        </Paper>
        {selected ? (
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{
                px: 3,
                py: 2.5,
                gap: 2,
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              <Box>
                <Typography component="h2" variant="h5">
                  {selected.name}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('crm.costing.serviceCatalog')}
                </Typography>
              </Box>
              {canManage && selected.is_active ? (
                <Button
                  startIcon={<AppIcon icon={plusIcon} />}
                  onClick={() => setServiceEditor(true)}
                >
                  {t('crm.costing.newService')}
                </Button>
              ) : null}
            </Stack>
            <Divider />
            {services.isPending ? (
              <Box sx={{ p: 3 }}>
                <Loading />
              </Box>
            ) : services.isError ? (
              <Box sx={{ p: 3 }}>
                <Failure error={services.error} retry={() => void services.refetch()} />
              </Box>
            ) : !services.data?.length ? (
              <Empty
                title={t('crm.costing.noServicesTitle')}
                description={t('crm.costing.noServicesDescription')}
              />
            ) : (
              <Stack divider={<Divider />}>
                {services.data.map((service) => (
                  <Stack
                    key={service.id}
                    direction="row"
                    sx={{
                      px: 3,
                      py: 2,
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{service.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {money(service.default_cost, service.currency)}
                      </Typography>
                    </Box>
                    <Stack direction="row" sx={{ alignItems: 'center' }}>
                      {!service.is_active ? (
                        <Chip size="small" label={t('crm.costing.inactive')} variant="outlined" />
                      ) : null}
                      {canManage ? (
                        <IconButton
                          aria-label={t('crm.costing.editService')}
                          onClick={() => setServiceEditor(service)}
                        >
                          <AppIcon icon={editIcon} />
                        </IconButton>
                      ) : null}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        ) : null}
      </Box>
      {editor ? (
        <CollaboratorDrawer
          organizationId={workspace.id}
          collaborator={editor === true ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {selected && serviceEditor ? (
        <CollaboratorServiceDrawer
          organizationId={workspace.id}
          collaborator={selected}
          service={serviceEditor === true ? undefined : serviceEditor}
          onClose={() => setServiceEditor(null)}
        />
      ) : null}
    </>
  )
}
