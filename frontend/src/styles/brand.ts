/**
 * The single place where a self-hosting team defines its visual identity.
 *
 * Keep this file limited to intentional brand choices. Derived colors such as
 * hover, selected, borders, light and dark variants are generated in theme.ts.
 */
export const brand = {
  colors: {
    primary: '#005bef',
    secondary: '#1473ff',
    lightBlue: '#eaf2ff',
    background: '#f5f8ff',
    surface: '#ffffff',
    text: '#0f1f38',
  },
  typography: {
    body: '"Manrope", "Inter", "Segoe UI", sans-serif',
    display: '"Manrope", "Inter", "Segoe UI", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
} as const
