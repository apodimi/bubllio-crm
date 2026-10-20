import checkIcon from '@iconify-icons/keyline-icons/check'
import chevronDownIcon from '@iconify-icons/keyline-icons/chevron-down'
import gridIcon from '@iconify-icons/keyline-icons/grid-2x2'
import { useNavigate } from '@tanstack/react-router'
import {
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../common/AppIcon'
import { workspaceInitials } from './workspaceInitials'

type Props = {
  organizationId?: string
  organizations: Array<{ id: string; name: string }>
  expanded: boolean
  onOrganizationChange: (organizationId: string) => void
  onClose: () => void
}

function SelectChevron({ className }: { className?: string }) {
  return (
    <span className={className}>
      <AppIcon icon={chevronDownIcon} size={18} />
    </span>
  )
}

export function WorkspaceSidebarSelector({
  organizationId,
  organizations,
  expanded,
  onOrganizationChange,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const selected = organizations.find((organization) => organization.id === organizationId)

  return (
    <>
      {expanded ? (
        <Typography
          variant="overline"
          sx={{ px: 1, mb: 1, color: 'text.secondary', letterSpacing: '.13em', fontSize: 10 }}
        >
          {t('common.workspace').toUpperCase()}
        </Typography>
      ) : null}
      <Select
        size="small"
        displayEmpty
        value={organizations.some(({ id }) => id === organizationId) ? organizationId : ''}
        inputProps={{ 'aria-label': t('common.selectWorkspace') }}
        onChange={(event) => {
          if (event.target.value === '__all_workspaces__') {
            onClose()
            void navigate({ to: '/' })
            return
          }
          onOrganizationChange(event.target.value)
        }}
        IconComponent={SelectChevron}
        renderValue={() =>
          selected ? (
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {workspaceInitials(selected.name)}
              </Avatar>
              <Typography variant="body2" noWrap sx={{ minWidth: 0, fontWeight: 650 }}>
                {selected.name}
              </Typography>
            </Stack>
          ) : (
            <Typography color="text.secondary">{t('common.selectWorkspace')}</Typography>
          )
        }
        MenuProps={{
          slotProps: { paper: { sx: { mt: 0.5, borderRadius: 1.5, minWidth: 210, p: 0.5 } } },
        }}
        sx={{
          width: expanded ? 'auto' : 44,
          alignSelf: expanded ? 'stretch' : 'center',
          mb: expanded ? 2.5 : 2,
          borderRadius: 1,
          color: 'text.primary',
          bgcolor: 'background.paper',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
          '& .MuiSelect-icon': { display: expanded ? 'block' : 'none', color: 'text.secondary' },
          '& .MuiSelect-select': {
            display: 'flex',
            justifyContent: expanded ? 'flex-start' : 'center',
            py: 0.75,
            pl: expanded ? 1.5 : 0.75,
            pr: expanded ? 4.5 : '6px !important',
          },
        }}
      >
        <MenuItem value="" disabled>
          {t('common.selectWorkspace')}
        </MenuItem>
        {organizations.map((organization) => (
          <MenuItem
            value={organization.id}
            key={organization.id}
            sx={{ borderRadius: 1.25, mb: 0.15, py: 0.75 }}
          >
            <Avatar
              sx={{
                width: 26,
                height: 26,
                mr: 1.25,
                bgcolor: 'action.selected',
                color: 'primary.main',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {workspaceInitials(organization.name)}
            </Avatar>
            <ListItemText
              primary={organization.name}
              slotProps={{ primary: { noWrap: true, sx: { fontWeight: 650 } } }}
            />
            {organization.id === organizationId ? (
              <Box sx={{ color: 'primary.main' }}>
                <AppIcon icon={checkIcon} size={18} />
              </Box>
            ) : null}
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          value="__all_workspaces__"
          onClick={() => {
            onClose()
            void navigate({ to: '/' })
          }}
          sx={{ borderRadius: 1.25, py: 0.75, color: 'text.secondary' }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}>
            <AppIcon icon={gridIcon} size={18} />
          </ListItemIcon>
          <ListItemText
            primary={t('common.allWorkspaces')}
            slotProps={{ primary: { sx: { fontWeight: 650 } } }}
          />
        </MenuItem>
      </Select>
    </>
  )
}
