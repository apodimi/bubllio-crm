import { IconButton, Stack, Typography } from '@mui/material'
import MenuRounded from '@mui/icons-material/MenuRounded'

type WorkspaceHeaderProps = {
  workspaceName?: string
  onOpenNavigation: () => void
}

export function WorkspaceHeader({ workspaceName, onOpenNavigation }: WorkspaceHeaderProps) {
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
      <Typography variant="caption" color="text.secondary">
        BUBLLIO CRM
      </Typography>
    </Stack>
  )
}
