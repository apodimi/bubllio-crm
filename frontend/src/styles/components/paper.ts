import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const paper: Components<Theme>['MuiPaper'] = {
  defaultProps: { elevation: 0 },
  styleOverrides: {
    root: { backgroundImage: 'none' },
    outlined: ({ theme }) => ({
      borderColor: theme.palette.divider,
      boxShadow: 'none',
      borderRadius: brand.shape.borderRadius,
      overflow: 'hidden',
      transition: theme.transitions.create('border-color', {
        duration: theme.transitions.duration.shorter,
      }),
    }),
  },
}
