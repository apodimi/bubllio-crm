import type { Components, Theme } from '@mui/material/styles'

export const cssBaseline: Components<Theme>['MuiCssBaseline'] = {
  styleOverrides: {
    html: { scrollBehavior: 'smooth' },
    body: {
      WebkitFontSmoothing: 'antialiased',
      backgroundImage:
        'radial-gradient(circle at 78% -10%, rgba(20,115,255,.11), transparent 34rem), radial-gradient(circle at 18% 12%, rgba(0,91,239,.07), transparent 28rem)',
      backgroundAttachment: 'fixed',
    },
    '::selection': { background: 'rgba(0,91,239,.2)' },
  },
}
