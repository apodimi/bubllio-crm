import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const chip: Components<Theme>['MuiChip'] = {
  styleOverrides: {
    root: {
      borderRadius: brand.shape.borderRadius * 0.5,
      fontWeight: 600,
    },
  },
}
