import { alpha } from '@mui/material/styles'
import type { Components, Theme } from '@mui/material/styles'

export const tableCell: Components<Theme>['MuiTableCell'] = {
  styleOverrides: {
    head: ({ theme }) => ({
      background: alpha(theme.palette.primary.main, 0.035),
      color: theme.palette.text.secondary,
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '0.01em',
      paddingBlock: 10,
    }),
    root: ({ theme }) => ({
      borderColor: alpha(theme.palette.text.primary, 0.08),
      paddingBlock: 12,
      'tbody tr:last-child &': { borderBottom: 0 },
    }),
  },
}
