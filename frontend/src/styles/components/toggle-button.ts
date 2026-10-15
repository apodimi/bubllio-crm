import type { Components, Theme } from '@mui/material/styles'

export const toggleButton: Components<Theme>['MuiToggleButton'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      minHeight: 38,
      borderColor: theme.palette.divider,
      borderRadius: `${theme.shape.borderRadius}px !important`,
      color: theme.palette.text.secondary,
      textTransform: 'none',
      fontWeight: 600,
      '&.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
        color: theme.palette.primary.main,
      },
      '@media (pointer: coarse)': { minHeight: 44 },
    }),
  },
}
