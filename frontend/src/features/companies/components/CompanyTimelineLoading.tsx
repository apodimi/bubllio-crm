import { Box, Divider, Skeleton, Stack } from '@mui/material'

export function CompanyTimelineLoading() {
  return (
    <Stack divider={<Divider />}>
      {[0, 1, 2].map((item) => (
        <Stack
          key={item}
          direction="row"
          spacing={{ xs: 1.5, sm: 2 }}
          sx={{ px: { xs: 2, sm: 3 }, py: 2 }}
        >
          <Skeleton variant="rounded" width={32} height={32} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="42%" />
            <Skeleton width="24%" />
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}
