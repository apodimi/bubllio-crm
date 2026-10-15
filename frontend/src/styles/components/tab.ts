import type { Components, Theme } from '@mui/material/styles'

export const tab: Components<Theme>['MuiTab'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      minHeight: 44,
      minWidth: 72,
      paddingInline: theme.spacing(1.5),
      textTransform: 'none',
      fontWeight: 600,
      color: theme.palette.text.secondary,
      '&.Mui-selected': { color: theme.palette.primary.main },
    }),
  },
}
