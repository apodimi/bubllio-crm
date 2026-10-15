import { alpha, type Components, type Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const dialog: Components<Theme>['MuiDialog'] = {
  styleOverrides: {
    paper: ({ theme }) => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: brand.shape.borderRadius + 4,
      boxShadow: `0 24px 72px ${alpha(theme.palette.text.primary, 0.18)}`,
      margin: theme.spacing(2),
      width: `calc(100% - ${theme.spacing(4)})`,
    }),
  },
}
