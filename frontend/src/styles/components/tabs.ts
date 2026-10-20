import type { Components, Theme } from '@mui/material/styles'

export const tabs: Components<Theme>['MuiTabs'] = {
  styleOverrides: {
    root: { minHeight: 44 },
    list: ({ theme }) => ({ gap: theme.spacing(1.5) }),
    indicator: ({ theme }) => ({ height: 2, borderRadius: theme.shape.borderRadius }),
  },
}
