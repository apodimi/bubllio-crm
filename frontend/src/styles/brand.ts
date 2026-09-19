/**
 * The single place where a self-hosting team defines its visual identity.
 *
 * Keep this file limited to intentional brand choices. Derived colors such as
 * hover, selected, borders, light and dark variants are generated in theme.ts.
 */
export const brand = {
  colors: {
    primary: '#24614d',
    secondary: '#a77737',
    background: '#f5f6f2',
    surface: '#ffffff',
    text: '#1d3029',
    textMuted: '#68756e',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
} as const
