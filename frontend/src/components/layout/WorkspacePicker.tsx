import { useState } from 'react'
import buildingIcon from '@iconify-icons/keyline-icons/building'
import checkIcon from '@iconify-icons/keyline-icons/check'
import chevronDownIcon from '@iconify-icons/keyline-icons/chevron-down'
import chevronRightIcon from '@iconify-icons/keyline-icons/chevron-right'
import { Link } from '@tanstack/react-router'
import { Avatar, Box, Button, Divider, Menu, MenuItem, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../common/AppIcon'
import { workspaceInitials } from './workspaceInitials'

export type WorkspaceOption = { id: string; name: string }

type WorkspacePickerProps = {
  organizationId?: string
  workspaceName?: string
  organizations: WorkspaceOption[]
  onOrganizationChange: (organizationId: string) => void
}

export function WorkspacePicker({
  organizationId,
  workspaceName,
  organizations,
  onOrganizationChange,
}: WorkspacePickerProps) {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  if (!organizationId || !workspaceName) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 650 }}>
        {t('common.allWorkspaces')}
      </Typography>
    )
  }

  function closeMenu() {
    setAnchor(null)
  }

  return (
    <>
      <Button
        aria-label={t('common.selectWorkspace')}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        endIcon={<AppIcon icon={chevronDownIcon} size={18} />}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          minWidth: { xs: 52, sm: 0 },
          width: { xs: 52, sm: 'auto' },
          px: { xs: 0.75, sm: 1 },
          border: { xs: 1, sm: 0 },
          borderColor: { xs: 'divider', sm: 'transparent' },
          borderRadius: 0.75,
          bgcolor: { xs: 'background.paper', sm: 'transparent' },
          color: 'text.primary',
          fontWeight: 650,
          '& .MuiButton-endIcon': { ml: { xs: 0.15, sm: 0.5 }, mr: 0 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            display: { xs: 'grid', sm: 'none' },
            placeItems: 'center',
            color: 'primary.main',
          }}
        >
          <AppIcon icon={buildingIcon} size={18} />
        </Box>
        <Typography
          component="span"
          variant="body2"
          noWrap
          sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 260 }}
        >
          {workspaceName}
        </Typography>
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              width: 288,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: 'min(420px, calc(100dvh - 24px))',
              mt: 0.75,
              p: 0.75,
              borderRadius: 1.5,
            },
          },
        }}
      >
        {organizations.map((organization) => {
          const isCurrent = organization.id === organizationId

          return (
            <MenuItem
              key={organization.id}
              aria-current={isCurrent ? 'page' : undefined}
              onClick={() => {
                closeMenu()
                onOrganizationChange(organization.id)
              }}
              sx={{
                minHeight: 44,
                px: 1,
                borderRadius: 1,
                color: isCurrent ? 'text.primary' : 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
              }}
            >
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  mr: 1.25,
                  borderRadius: 1,
                  bgcolor: isCurrent ? 'text.primary' : 'action.hover',
                  color: isCurrent ? 'background.paper' : 'text.secondary',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {workspaceInitials(organization.name)}
              </Avatar>
              <Typography
                variant="body2"
                noWrap
                sx={{ flex: 1, fontWeight: isCurrent ? 700 : 550 }}
              >
                {organization.name}
              </Typography>
              {isCurrent ? (
                <Box sx={{ ml: 1, color: 'primary.main' }}>
                  <AppIcon icon={checkIcon} size={19} />
                </Box>
              ) : null}
            </MenuItem>
          )
        })}
        <Divider sx={{ my: 0.75 }} />
        <MenuItem
          component={Link}
          to="/"
          onClick={closeMenu}
          sx={{
            minHeight: 44,
            px: 1,
            borderRadius: 1,
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              width: 30,
              height: 30,
              mr: 1.25,
              placeItems: 'center',
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          >
            <AppIcon icon={buildingIcon} size={17} />
          </Box>
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
            {t('common.allWorkspaces')}
          </Typography>
          <Box sx={{ ml: 1 }}>
            <AppIcon icon={chevronRightIcon} size={19} />
          </Box>
        </MenuItem>
      </Menu>
    </>
  )
}
