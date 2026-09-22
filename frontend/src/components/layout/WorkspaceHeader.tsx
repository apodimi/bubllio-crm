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
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null)
  const initials = username?.slice(0, 1).toUpperCase() ?? '?'

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 5 },
        py: 2.5,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <IconButton
          aria-label="Open navigation"
          onClick={onOpenNavigation}
          sx={{ display: { md: 'none' } }}
        >
          <MenuRounded />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          Workspace <span style={{ margin: '0 12px', opacity: 0.4 }}>/</span>{' '}
          {workspaceName ?? 'All workspaces'}
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
        <Tooltip title="Account menu">
          <IconButton
            aria-label="Open account menu"
            onClick={(event) => setAccountAnchor(event.currentTarget)}
            sx={{ p: 0.25 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: 14,
                fontWeight: 700,
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
              {isSuperuser ? 'Installation administrator' : 'Workspace member'}
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
              Account settings
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
            Sign out
          </MenuItem>
        </Menu>
      </Stack>
    </Stack>
  )
}
