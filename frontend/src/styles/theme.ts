import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#24614d', dark: '#173e32', light: '#e8f2eb' },
    secondary: { main: '#a77737' },
    background: { default: '#f5f6f2', paper: '#ffffff' },
    text: { primary: '#1d3029', secondary: '#68756e' },
    divider: '#e3e8e1',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h3: { fontWeight: 700, letterSpacing: '-1.2px' },
    h4: { fontWeight: 700, letterSpacing: '-.7px' },
    h6: { fontWeight: 650 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8 } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { outlined: { borderColor: '#e3e8e1' } } },
    MuiTableCell: { styleOverrides: { head: { background: '#f9faf7', color: '#68756e', fontWeight: 600, fontSize: 12 }, root: { borderColor: '#eef1eb' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
  },
})
