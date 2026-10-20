import { useState } from 'react'
import arrowLeftIcon from '@iconify-icons/keyline-icons/arrow-left'
import checkIcon from '@iconify-icons/keyline-icons/check'
import chevronDownIcon from '@iconify-icons/keyline-icons/chevron-down'
import chevronRightIcon from '@iconify-icons/keyline-icons/chevron-right'
import globeIcon from '@iconify-icons/keyline-icons/globe'
import logOutIcon from '@iconify-icons/keyline-icons/log-out'
import settingsIcon from '@iconify-icons/keyline-icons/settings'
import userCogIcon from '@iconify-icons/keyline-icons/user-cog'
import userPlusIcon from '@iconify-icons/keyline-icons/user-plus'
import { Link } from '@tanstack/react-router'
import {
  Avatar,
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListSubheader,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppIcon } from '../common/AppIcon'

type AccountMenuProps = {
  organizationId?: string
  workspaceName?: string
  username: string | null
  isSuperuser: boolean
  canManageWorkspace: boolean
  onLogout: () => void
}

export function AccountMenu({
  organizationId,
  workspaceName,
  username,
  isSuperuser,
  canManageWorkspace,
  onLogout,
}: AccountMenuProps) {
  const { i18n, t } = useTranslation()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const [view, setView] = useState<'main' | 'language'>('main')
  const language = i18n.resolvedLanguage === 'el' ? 'el' : 'en'
  const userInitial = username?.slice(0, 1).toUpperCase() ?? '?'

  function closeMenu() {
    setAnchor(null)
    setView('main')
  }

  return (
    <>
      <Tooltip title={t('navigation.accountMenu')}>
        <Button
          aria-label={t('navigation.openAccountMenu')}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          onClick={(event) => setAnchor(event.currentTarget)}
          endIcon={<AppIcon icon={chevronDownIcon} size={18} />}
          sx={{
            minHeight: { xs: 44, sm: 48 },
            minWidth: { xs: 44, sm: 0 },
            p: { xs: 0.5, sm: 0.5 },
            pr: { xs: 0.5, sm: 1.25 },
            gap: { xs: 0, sm: 1 },
            borderRadius: 2,
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 1,
            '&:hover': { bgcolor: 'background.paper', boxShadow: 2 },
            '& .MuiButton-endIcon': {
              display: { xs: 'none', sm: 'flex' },
              ml: 0,
              color: 'text.secondary',
            },
          }}
        >
          <Avatar
            sx={{
              width: { xs: 36, sm: 38 },
              height: { xs: 36, sm: 38 },
              borderRadius: 1.5,
              bgcolor: 'text.primary',
              color: 'background.paper',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {userInitial}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0, textAlign: 'left' }}>
            <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 800 }}>
              {username}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: 'block', maxWidth: 180, fontSize: 10.5 }}
            >
              {workspaceName ?? t('common.allWorkspaces')}
            </Typography>
          </Box>
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { minWidth: 240, maxHeight: 'min(420px, calc(100dvh - 24px))', mt: 1 } },
        }}
      >
        {view === 'main' ? (
          <AccountMainMenu
            organizationId={organizationId}
            username={username}
            isSuperuser={isSuperuser}
            canManageWorkspace={canManageWorkspace}
            language={language}
            onClose={closeMenu}
            onOpenLanguage={() => setView('language')}
            onLogout={onLogout}
          />
        ) : (
          <LanguageMenu language={language} onBack={() => setView('main')} onClose={closeMenu} />
        )}
      </Menu>
    </>
  )
}

type AccountMainMenuProps = Omit<AccountMenuProps, 'workspaceName'> & {
  language: 'en' | 'el'
  onClose: () => void
  onOpenLanguage: () => void
}

function AccountMainMenu({
  organizationId,
  username,
  isSuperuser,
  canManageWorkspace,
  language,
  onClose,
  onOpenLanguage,
  onLogout,
}: AccountMainMenuProps) {
  const { t } = useTranslation()

  return (
    <>
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
      <MenuItem component={Link} to="/account/settings" onClick={onClose}>
        <ListItemIcon>
          <AppIcon icon={userCogIcon} size={18} />
        </ListItemIcon>
        {t('navigation.accountSettings')}
      </MenuItem>
      {isSuperuser ? (
        <>
          <ListSubheader
            disableSticky
            sx={{ px: 2, pt: 1, lineHeight: 2, fontSize: 10, letterSpacing: '.08em' }}
          >
            {t('navigation.installation')}
          </ListSubheader>
          <MenuItem component={Link} to="/account/settings" onClick={onClose}>
            <ListItemIcon>
              <AppIcon icon={settingsIcon} size={18} />
            </ListItemIcon>
            {t('navigation.installationSettings')}
          </MenuItem>
        </>
      ) : null}
      {canManageWorkspace && organizationId ? (
        <>
          <ListSubheader
            disableSticky
            sx={{ px: 2, pt: 1, lineHeight: 2, fontSize: 10, letterSpacing: '.08em' }}
          >
            {t('navigation.workspace')}
          </ListSubheader>
          <Link
            to="/organizations/$organizationId/members"
            params={{ organizationId }}
            onClick={onClose}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            <MenuItem>
              <ListItemIcon>
                <AppIcon icon={userPlusIcon} size={18} />
              </ListItemIcon>
              {t('navigation.peopleAndPermissions')}
            </MenuItem>
          </Link>
          <Link
            to="/organizations/$organizationId/settings"
            params={{ organizationId }}
            onClick={onClose}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            <MenuItem>
              <ListItemIcon>
                <AppIcon icon={settingsIcon} size={18} />
              </ListItemIcon>
              {t('navigation.workspaceSettings')}
            </MenuItem>
          </Link>
        </>
      ) : null}
      <Divider />
      <MenuItem aria-haspopup="menu" aria-expanded={false} onClick={onOpenLanguage}>
        <ListItemIcon>
          <AppIcon icon={globeIcon} size={18} />
        </ListItemIcon>
        <Typography variant="body2" sx={{ flex: 1 }}>
          {t('common.language')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          {language === 'en' ? t('common.english') : t('common.greek')}
        </Typography>
        <Box sx={{ color: 'text.secondary' }}>
          <AppIcon icon={chevronRightIcon} size={18} />
        </Box>
      </MenuItem>
      <Divider />
      <MenuItem
        onClick={() => {
          onClose()
          void onLogout()
        }}
      >
        <ListItemIcon>
          <AppIcon icon={logOutIcon} size={18} />
        </ListItemIcon>
        {t('navigation.signOut')}
      </MenuItem>
    </>
  )
}

type LanguageMenuProps = {
  language: 'en' | 'el'
  onBack: () => void
  onClose: () => void
}

function LanguageMenu({ language, onBack, onClose }: LanguageMenuProps) {
  const { i18n, t } = useTranslation()

  return (
    <>
      <MenuItem autoFocus onClick={onBack}>
        <ListItemIcon>
          <AppIcon icon={arrowLeftIcon} size={18} />
        </ListItemIcon>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t('common.language')}
        </Typography>
      </MenuItem>
      <Divider />
      {(['en', 'el'] as const).map((option) => (
        <MenuItem
          key={option}
          role="menuitemradio"
          aria-checked={language === option}
          selected={language === option}
          onClick={() => {
            void i18n.changeLanguage(option)
            onClose()
          }}
        >
          <Typography variant="body2" sx={{ flex: 1 }}>
            {option === 'en' ? t('common.english') : t('common.greek')}
          </Typography>
          {language === option ? (
            <Box sx={{ color: 'primary.main' }}>
              <AppIcon icon={checkIcon} size={18} />
            </Box>
          ) : null}
        </MenuItem>
      ))}
    </>
  )
}
