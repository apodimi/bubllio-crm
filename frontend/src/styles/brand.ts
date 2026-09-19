/**
 * The single place where a self-hosting team defines its visual identity.
 *
 * Keep this file limited to intentional brand choices. Derived colors such as
 * hover, selected, borders, light and dark variants are generated in theme.ts.
 */
export const brand = {
  colors: {
    primary: '#0c66e4',
    secondary: '#5e4db2',
    background: '#f7f8f9',
    surface: '#ffffff',
    text: '#172b4d',
    textMuted: '#44546f',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
} as const
