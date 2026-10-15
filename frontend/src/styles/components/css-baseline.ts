import { alpha, type Components, type Theme } from '@mui/material/styles'

export const cssBaseline: Components<Theme>['MuiCssBaseline'] = {
  styleOverrides: (theme) => ({
    'html, body': {
      overscrollBehavior: 'none',
    },
    body: {
      WebkitFontSmoothing: 'antialiased',
      backgroundImage: 'none',
    },
    html: { scrollBehavior: 'smooth', WebkitTapHighlightColor: 'transparent' },
    '::selection': {
      background: alpha(theme.palette.primary.main, 0.2),
      color: theme.palette.text.primary,
    },
    ':focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 3,
    },
    a: { textUnderlineOffset: '0.18em' },
    'button, [role="button"], a': {
      WebkitTapHighlightColor: 'transparent',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      touchAction: 'manipulation',
    },
    'input, textarea': { caretColor: theme.palette.primary.main },
    '@media (prefers-reduced-motion: reduce)': {
      '*, *::before, *::after': {
        animationDuration: '0.01ms !important',
        transitionDuration: '0.01ms !important',
        scrollBehavior: 'auto !important',
      },
    },
    '@media (pointer: coarse)': {
      'input, textarea, select': { fontSize: 16 },
    },
  }),
}
