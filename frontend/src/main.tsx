import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { AuthProvider } from './features/auth'
import { queryClient } from './config/queryClient'
import { theme } from './styles/theme'
import { router } from './routes/router'
import './i18n'
import './styles/fonts'

window.addEventListener('vite:preloadError', (event) => {
  try {
    const key = 'bubllio-preload-reload-at'
    const lastReload = Number(window.sessionStorage.getItem(key) ?? 0)
    if (Date.now() - lastReload < 60_000) return
    window.sessionStorage.setItem(key, String(Date.now()))
  } catch {
    return
  }

  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
