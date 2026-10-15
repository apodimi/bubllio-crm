import type { Components, Theme } from '@mui/material/styles'
import { brand } from '../brand'

export const button: Components<Theme>['MuiButton'] = {
  defaultProps: { disableElevation: true },
  styleOverrides: {
    root: {
      minHeight: 38,
      borderRadius: brand.shape.borderRadius,
      paddingInline: 14,
      transition:
        'transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms cubic-bezier(.2,.8,.2,1), background-color 220ms cubic-bezier(.2,.8,.2,1)',
      '&:active': { transform: 'scale(.985)' },
      '&.Mui-focusVisible': { outline: `3px solid ${brand.colors.lightBlue}`, outlineOffset: 2 },
      '@media (pointer: coarse)': { minHeight: 44 },
    },
    contained: {
      boxShadow: 'none',
      '@media (hover: hover) and (pointer: fine)': {
        '&:hover': { boxShadow: `0 6px 18px ${brand.colors.lightBlue}` },
      },
    },
  },
}
