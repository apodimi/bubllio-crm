import { Box, Divider, Link, Stack, Typography } from '@mui/material'
import type { Company } from '../../../types/company.types'

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.35, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

export function CompanyProfileContent({ company }: { company: Company }) {
  const address = [
    company.address_line_1,
    company.address_line_2,
    [company.postal_code, company.city].filter(Boolean).join(' '),
    company.country,
  ].filter(Boolean)

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Contact details
        </Typography>
        <Stack spacing={1.5}>
          <Detail label="Email" value={company.email} />
          <Detail label="Phone" value={company.phone_number} />
          <Box>
            <Typography variant="caption" color="text.secondary">
              Website
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.35 }}>
              {company.website ? (
                <Link href={company.website} target="_blank" rel="noreferrer">
                  {company.website}
                </Link>
              ) : (
                '—'
              )}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Business details
        </Typography>
        <Stack spacing={1.5}>
          <Detail label="Customer code" value={company.customer_code} />
          <Detail label="Account owner" value={company.assigned_to_name || 'Unassigned'} />
          <Detail label="Tax / VAT ID" value={company.tax_id} />
          <Detail label="Industry" value={company.industry} />
          <Detail label="Address" value={address.join(', ')} />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Internal notes
        </Typography>
        <Typography variant="body2" color={company.notes ? 'text.primary' : 'text.secondary'}>
          {company.notes || 'No internal notes yet.'}
        </Typography>
      </Box>
    </Stack>
  )
}
