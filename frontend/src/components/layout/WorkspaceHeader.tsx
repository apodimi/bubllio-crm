import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Avatar,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import MenuRounded from '@mui/icons-material/MenuRounded'
import ManageAccountsRounded from '@mui/icons-material/ManageAccountsRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../common/LanguageSwitcher'

type WorkspaceHeaderProps = {
  workspaceName?: string
  onOpenNavigation: () => void
  username: string | null
  isSuperuser: boolean
  onLogout: () => void
}

export function WorkspaceHeader({
  workspaceName,
  onOpenNavigation,
  username,
  isSuperuser,
  onLogout,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation()
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null)
  const initials = username?.slice(0, 1).toUpperCase() ?? '?'

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 5 },
        py: 1.75,
        position: 'sticky',
        top: 0,
        zIndex: 'appBar',
        bgcolor: 'rgba(255,255,255,.78)',
        backdropFilter: 'blur(18px)',
        boxShadow: 'inset 0 -1px rgba(15,31,56,.08)',
      }}
    >
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <IconButton
          aria-label={t('navigation.openNavigation')}
          onClick={onOpenNavigation}
          sx={{ display: { md: 'none' } }}
        >
          <MenuRounded />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          {t('common.workspace')} <span style={{ margin: '0 10px', opacity: 0.35 }}>/</span>{' '}
          {workspaceName ?? t('common.allWorkspaces')}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          BUBLLIO CRM
        </Typography>
        <LanguageSwitcher compact />
        <Tooltip title={t('navigation.accountMenu')}>
          <IconButton
            aria-label={t('navigation.openAccountMenu')}
            onClick={(event) => setAccountAnchor(event.currentTarget)}
            sx={{ p: 0.25 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #005bef, #1473ff)',
                color: 'primary.contrastText',
                fontSize: 14,
                fontWeight: 800,
                boxShadow: '0 8px 18px rgba(0,91,239,.22)',
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={accountAnchor}
          open={Boolean(accountAnchor)}
          onClose={() => setAccountAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
        >
          <MenuItem disabled sx={{ opacity: 1, display: 'block', py: 1.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isSuperuser
                ? t('navigation.installationAdministrator')
                : t('navigation.workspaceMember')}
            </Typography>
          </MenuItem>
          {isSuperuser && (
            <MenuItem
              component={Link}
              to="/account/settings"
              onClick={() => setAccountAnchor(null)}
            >
              <ListItemIcon>
                <ManageAccountsRounded fontSize="small" />
              </ListItemIcon>
              {t('navigation.accountSettings')}
            </MenuItem>
          )}
          <Divider />
          <MenuItem
            onClick={() => {
              setAccountAnchor(null)
              void onLogout()
            }}
          >
            <ListItemIcon>
              <LogoutRounded fontSize="small" />
            </ListItemIcon>
            {t('navigation.signOut')}
          </MenuItem>
        </Menu>
      </Stack>
    </Stack>
  )
}
