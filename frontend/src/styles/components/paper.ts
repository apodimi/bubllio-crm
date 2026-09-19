import type { Components, Theme } from '@mui/material/styles'

export const paper: Components<Theme>['MuiPaper'] = {
  defaultProps: { elevation: 0 },
  styleOverrides: {
    outlined: ({ theme }) => ({ borderColor: theme.palette.divider }),
  },
}
