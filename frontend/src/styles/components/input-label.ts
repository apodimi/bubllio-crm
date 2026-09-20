import type { Components, Theme } from '@mui/material/styles'

export const inputLabel: Components<Theme>['MuiInputLabel'] = {
  defaultProps: {
    shrink: true,
  },
  styleOverrides: {
    root: ({ theme }) => ({
      position: 'static',
      color: theme.palette.text.secondary,
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.4,
      marginBottom: 6,
      maxWidth: '100%',
      overflow: 'visible',
      transform: 'none',
      transition: theme.transitions.create(
        ['color'],
        { duration: theme.transitions.duration.shorter },
      ),
      '&.MuiInputLabel-shrink': {
        transform: 'none',
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
