import type { Components, Theme } from '@mui/material/styles'

export const inputLabel: Components<Theme>['MuiInputLabel'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      color: theme.palette.text.secondary,
      fontWeight: 500,
      transform: 'translate(14px, 16px) scale(1)',
      transition: theme.transitions.create(
        ['color', 'transform', 'max-width'],
        { duration: theme.transitions.duration.shorter },
      ),
      '&.MuiInputLabel-sizeSmall': {
        transform: 'translate(14px, 9px) scale(1)',
      },
      '&.MuiInputLabel-shrink': {
        maxWidth: 'calc(133% - 32px)',
        paddingInline: 4,
        backgroundColor: theme.palette.background.paper,
        transform: 'translate(10px, -9px) scale(0.75)',
        transformOrigin: 'top left',
      },
      '&.Mui-focused': {
        color: theme.palette.primary.main,
      },
      '&.Mui-error': {
        color: theme.palette.error.main,
      },
    }),
  },
}
