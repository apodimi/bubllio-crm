import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const listItemText: Components<Theme>['MuiListItemText'] = {
  styleOverrides: {
    primary: {
      fontFamily: brand.typography.display,
    },
  },
}
