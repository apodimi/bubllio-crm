export function apiBase(value = import.meta.env.VITE_API_BASE_PATH || '/api/v1') {
  if (!value.startsWith('/') || value.startsWith('//') || /[?#\\]/.test(value)) {
    throw new Error('VITE_API_BASE_PATH must be a same-origin path.')
  }
  return value.replace(/\/$/, '')
}
