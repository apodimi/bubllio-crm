import type { Components, Theme } from '@mui/material/styles'

export const menuItem: Components<Theme>['MuiMenuItem'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      ...theme.typography.body2,
      minHeight: 36,
      paddingTop: 7,
      paddingBottom: 7,
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      '@media (min-width: 600px)': { minHeight: 36 },
      '@media (pointer: coarse)': { minHeight: 44, fontSize: '1rem' },
      '& .MuiListItemText-primary': { fontSize: 'inherit' },
    }),
  },
}
