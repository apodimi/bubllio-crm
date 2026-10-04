import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const button: Components<Theme>['MuiButton'] = {
  defaultProps: { disableElevation: true },
  styleOverrides: {
    root: {
      minHeight: 40,
      borderRadius: brand.shape.borderRadius,
      paddingInline: 18,
      transition: 'transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms cubic-bezier(.2,.8,.2,1), background-color 220ms cubic-bezier(.2,.8,.2,1)',
      '&:hover': { transform: 'translateY(-1px)' },
      '&:active': { transform: 'translateY(0) scale(.985)' },
      '&.Mui-focusVisible': { outline: '3px solid rgba(0,91,239,.2)', outlineOffset: 2 },
    },
    contained: {
      boxShadow: '0 8px 20px rgba(0,91,239,.18)',
      '&:hover': { boxShadow: '0 12px 28px rgba(0,91,239,.24)' },
    },
  },
}
