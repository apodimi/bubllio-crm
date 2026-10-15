import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const tooltip: Components<Theme>['MuiTooltip'] = {
  defaultProps: { enterDelay: 450 },
  styleOverrides: {
    tooltip: ({ theme }) => ({
      backgroundColor: theme.palette.text.primary,
      color: theme.palette.background.paper,
      borderRadius: brand.shape.borderRadius * 0.5,
      fontSize: 12,
      padding: theme.spacing(0.75, 1),
    }),
    arrow: ({ theme }) => ({ color: theme.palette.text.primary }),
  },
}
