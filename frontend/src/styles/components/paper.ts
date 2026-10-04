import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const paper: Components<Theme>['MuiPaper'] = {
  defaultProps: { elevation: 0 },
  styleOverrides: {
    root: { backgroundImage: 'none' },
    outlined: ({ theme }) => ({
      borderColor: 'transparent',
      boxShadow: `inset 0 0 0 1px ${theme.palette.divider}, 0 14px 36px rgba(15,31,56,.055)`,
      borderRadius: brand.shape.borderRadius * 1.25,
    }),
  },
}
