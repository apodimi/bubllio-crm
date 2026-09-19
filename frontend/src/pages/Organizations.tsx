import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { organizationsQuery, keys } from '../api/queries'
import { Loading, Failure, Empty, PageHeading } from '../components/Feedback'
import { CreateDialog } from '../components/CreateDialog'

export function Organizations() {
  const query = useQuery(organizationsQuery)
  const [create, setCreate] = useState(false)
  return <>
    <PageHeading title="Your workspaces" description="A home for every team and every relationship."
      action={<Button variant="contained" startIcon={<AddRounded />} onClick={() => setCreate(true)}>New workspace</Button>} />
    {query.isPending ? <Loading /> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()} /> :
      query.data.length === 0 ? <Empty title="Start with a workspace" description="Create your first workspace to organize companies and contacts." /> :
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 3 }}>
        {query.data.map(org => <Card variant="outlined" key={org.id}>
          <Link to="/organizations/$organizationId" params={{ organizationId: org.id }} style={{ display: 'block', height: '100%', color: 'inherit', textDecoration: 'none' }}>
          <CardActionArea component="div" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 4 }}>
                <Box sx={{ width: 48, height: 48, bgcolor: 'primary.light', color: 'primary.main', borderRadius: 2, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700 }}>{org.name.slice(0, 1).toUpperCase()}</Box>
                <Chip size="small" label={org.current_user_role ?? 'Superuser'} variant="outlined" />
              </Stack>
              <Typography variant="h6">{org.name}</Typography><Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>{org.slug}</Typography>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center', color: 'primary.main' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>Open workspace</Typography><ArrowForwardRounded fontSize="small" /></Stack>
            </CardContent>
          </CardActionArea>
          </Link>
        </Card>)}
      </Box>}
    {create && <CreateDialog title="Create workspace" path="/organizations/" invalidate={keys.organizations} onClose={() => setCreate(false)}
      fields={[{ name: 'name', label: 'Workspace name', required: true, maxLength: 255 }, { name: 'slug', label: 'Slug (letters, numbers, hyphens or underscores)', required: true, maxLength: 50 }]} />}
  </>
}
