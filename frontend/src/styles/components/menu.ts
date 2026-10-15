import type { Components, Theme } from '@mui/material/styles'

export const menu: Components<Theme>['MuiMenu'] = {
  styleOverrides: {
    paper: { maxHeight: 'min(320px, calc(100dvh - 32px))', maxWidth: 'calc(100vw - 32px)' },
    list: { paddingTop: 4, paddingBottom: 4 },
  },
}
