import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { AuthProvider, initializeSuiteSession } from './features/auth'
import { queryClient } from './config/queryClient'
import { theme } from './styles/theme'
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

async function start() {
  await initializeSuiteSession()
  const { router } = await import('./routes/router')

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
}

void start().catch(() => {
  const root = document.getElementById('root')
  if (root) root.textContent = 'Suite sign-in is unavailable. Reload to try again.'
})
