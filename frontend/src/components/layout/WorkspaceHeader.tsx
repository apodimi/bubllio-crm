import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import BusinessRounded from '@mui/icons-material/BusinessRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import ManageAccountsRounded from '@mui/icons-material/ManageAccountsRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowRightRounded from '@mui/icons-material/KeyboardArrowRightRounded'
import TranslateRounded from '@mui/icons-material/TranslateRounded'
import { useTranslation } from 'react-i18next'

import { GlobalSearch } from '../../features/global-search'

type WorkspaceHeaderProps = {
  organizationId?: string
  workspaceName?: string
  organizations: Array<{ id: string; name: string }>
  onOrganizationChange: (organizationId: string) => void
  onOpenNavigation: () => void
  username: string | null
  isSuperuser: boolean
  onLogout: () => void
}

export function WorkspaceHeader({
  organizationId,
  workspaceName,
  organizations,
  onOrganizationChange,
  onOpenNavigation,
  username,
  isSuperuser,
  onLogout,
}: WorkspaceHeaderProps) {
  const { i18n, t } = useTranslation()
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null)
  const [accountView, setAccountView] = useState<'main' | 'language'>('main')
  const [workspaceAnchor, setWorkspaceAnchor] = useState<null | HTMLElement>(null)
  const language = i18n.resolvedLanguage === 'el' ? 'el' : 'en'
  const initials = username?.slice(0, 1).toUpperCase() ?? '?'
  const organizationInitials = (name: string) =>
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  function closeAccountMenu() {
    setAccountAnchor(null)
    setAccountView('main')
  }
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 'appBar',
        bgcolor: 'background.default',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, md: 3, lg: 4.5 },
          minHeight: { xs: 64, md: 80 },
        }}
      >
        <Stack direction="row" sx={{ gap: { xs: 0.25, sm: 1 }, alignItems: 'center', minWidth: 0 }}>
          <IconButton
            aria-label={t('navigation.openNavigation')}
            onClick={onOpenNavigation}
            sx={{ display: { md: 'none' } }}
          >
            <MenuRounded />
          </IconButton>
          {organizationId && workspaceName ? (
            <Button
              aria-label={t('common.selectWorkspace')}
              aria-haspopup="menu"
              aria-expanded={Boolean(workspaceAnchor)}
              endIcon={<KeyboardArrowDownRounded />}
              onClick={(event) => setWorkspaceAnchor(event.currentTarget)}
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
                <BusinessRounded sx={{ fontSize: 18 }} />
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
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 650 }}>
              {t('common.allWorkspaces')}
            </Typography>
          )}
          <Menu
            anchorEl={workspaceAnchor}
            open={Boolean(workspaceAnchor)}
            onClose={() => setWorkspaceAnchor(null)}
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
            {organizations.map((organization) => (
              <MenuItem
                key={organization.id}
                aria-current={organization.id === organizationId ? 'page' : undefined}
                onClick={() => {
                  setWorkspaceAnchor(null)
                  onOrganizationChange(organization.id)
                }}
                sx={{
                  minHeight: 44,
                  px: 1,
                  borderRadius: 1,
                  color: organization.id === organizationId ? 'text.primary' : 'text.secondary',
                  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                }}
              >
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    mr: 1.25,
                    borderRadius: 1,
                    bgcolor: organization.id === organizationId ? 'text.primary' : 'action.hover',
                    color:
                      organization.id === organizationId ? 'background.paper' : 'text.secondary',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {organizationInitials(organization.name)}
                </Avatar>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    flex: 1,
                    fontWeight: organization.id === organizationId ? 700 : 550,
                  }}
                >
                  {organization.name}
                </Typography>
                {organization.id === organizationId ? (
                  <CheckRounded color="primary" sx={{ ml: 1, fontSize: 19 }} />
                ) : null}
              </MenuItem>
            ))}
            <Divider sx={{ my: 0.75 }} />
            <MenuItem
              component={Link}
              to="/"
              onClick={() => setWorkspaceAnchor(null)}
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
                <BusinessRounded sx={{ fontSize: 17 }} />
              </Box>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                {t('common.allWorkspaces')}
              </Typography>
              <KeyboardArrowRightRounded sx={{ ml: 1, fontSize: 19 }} />
            </MenuItem>
          </Menu>
        </Stack>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', flexShrink: 0, gap: { xs: 0.25, sm: 1.25 } }}
        >
          <GlobalSearch
            currentOrganizationId={organizationId}
            currentWorkspaceName={workspaceName}
          />
          <Tooltip title={t('navigation.accountMenu')}>
            <Button
              aria-label={t('navigation.openAccountMenu')}
              aria-haspopup="menu"
              aria-expanded={Boolean(accountAnchor)}
              onClick={(event) => setAccountAnchor(event.currentTarget)}
              endIcon={<KeyboardArrowDownRounded />}
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
                {initials}
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
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={closeAccountMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 240,
                  maxHeight: 'min(420px, calc(100dvh - 24px))',
                  mt: 1,
                },
              },
            }}
          >
            {accountView === 'main' ? (
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
                {isSuperuser ? (
                  <MenuItem component={Link} to="/account/settings" onClick={closeAccountMenu}>
                    <ListItemIcon>
                      <ManageAccountsRounded fontSize="small" />
                    </ListItemIcon>
                    {t('navigation.accountSettings')}
                  </MenuItem>
                ) : null}
                <Divider />
                <MenuItem
                  aria-haspopup="menu"
                  aria-expanded={false}
                  onClick={() => setAccountView('language')}
                >
                  <ListItemIcon>
                    <TranslateRounded fontSize="small" />
                  </ListItemIcon>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {t('common.language')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                    {language === 'en' ? t('common.english') : t('common.greek')}
                  </Typography>
                  <KeyboardArrowRightRounded fontSize="small" color="action" />
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    closeAccountMenu()
                    void onLogout()
                  }}
                >
                  <ListItemIcon>
                    <LogoutRounded fontSize="small" />
                  </ListItemIcon>
                  {t('navigation.signOut')}
                </MenuItem>
              </>
            ) : (
              <>
                <MenuItem autoFocus onClick={() => setAccountView('main')}>
                  <ListItemIcon>
                    <ArrowBackRounded fontSize="small" />
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
                      closeAccountMenu()
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {option === 'en' ? t('common.english') : t('common.greek')}
                    </Typography>
                    {language === option ? <CheckRounded color="primary" fontSize="small" /> : null}
                  </MenuItem>
                ))}
              </>
            )}
          </Menu>
        </Stack>
      </Stack>
    </Box>
  )
}
