import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const button: Components<Theme>['MuiButton'] = {
  defaultProps: { disableElevation: true },
  styleOverrides: {
    root: {
      minHeight: 36,
      borderRadius: brand.shape.borderRadius * 0.75,
      paddingInline: 14,
    },
  },
}
