import { alpha } from '@mui/material/styles'
import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const listItemButton: Components<Theme>['MuiListItemButton'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: brand.shape.borderRadius,
      '&.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
        color: theme.palette.primary.main,
      },
      '@media (hover: hover) and (pointer: fine)': {
        '&.Mui-selected:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.14),
        },
      },
      '&:active': { backgroundColor: alpha(theme.palette.primary.main, 0.12) },
    }),
  },
}
