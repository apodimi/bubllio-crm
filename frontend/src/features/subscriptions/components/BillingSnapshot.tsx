import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

type BillingSnapshotProps = {
  collected: Record<string, string>
  open: Record<string, string>
  overdue: Record<string, string>
}

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

export function BillingSnapshot({ collected, open, overdue }: BillingSnapshotProps) {
  const { t } = useTranslation()
  const currencies = [
    ...new Set([...Object.keys(collected), ...Object.keys(open), ...Object.keys(overdue)]),
  ]

  if (!currencies.length) {
    return <Typography color="text.secondary">{t('crm.billingChart.empty')}</Typography>
  }

  return (
    <Stack spacing={3}>
      {currencies.map((currency) => {
        const values = [
          {
            label: t('crm.billingChart.collected'),
            value: Number(collected[currency] ?? 0),
            color: 'success.main',
          },
          {
            label: t('crm.billingChart.open'),
            value: Number(open[currency] ?? 0),
            color: 'primary.main',
          },
          {
            label: t('crm.billingChart.overdue'),
            value: Number(overdue[currency] ?? 0),
            color: 'error.main',
          },
        ]
        const max = Math.max(...values.map((item) => item.value), 1)

        return (
          <Box key={currency}>
            <Typography variant="overline" color="text.secondary">
              {currency}
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 0.5 }}>
              {values.map((item) => (
                <Box key={item.label}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{item.label}</Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatMoney(item.value, currency)}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      height: 7,
                      borderRadius: 4,
                      bgcolor: 'action.hover',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      role="img"
                      aria-label={`${item.label}: ${formatMoney(item.value, currency)}`}
                      sx={{
                        width: `${(item.value / max) * 100}%`,
                        height: '100%',
                        bgcolor: item.color,
                        borderRadius: 4,
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}
