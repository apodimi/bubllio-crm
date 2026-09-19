import { alpha } from '@mui/material/styles'
import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const listItemButton: Components<Theme>['MuiListItemButton'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: brand.shape.borderRadius * 0.75,
      '&.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
        color: theme.palette.primary.main,
      },
      '&.Mui-selected:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.14),
      },
    }),
  },
}
