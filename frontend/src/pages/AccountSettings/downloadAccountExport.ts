const ACCOUNT_EXPORT_FILENAME = 'bubllio-account-export.json'

export function downloadAccountExport(file: Blob) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = ACCOUNT_EXPORT_FILENAME
  link.click()
  URL.revokeObjectURL(url)
}
