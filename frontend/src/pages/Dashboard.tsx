import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { companiesQuery, contactsQuery, automationsQuery } from '../api/queries'
import { useWorkspace } from '../app/workspace'
import { Failure, Loading, PageHeading } from '../components/Feedback'

export function Dashboard() {
  const org = useWorkspace()
  const companies = useQuery(companiesQuery(org.id))
  const contacts = useQuery(contactsQuery(org.id))
  const automations = useQuery(automationsQuery(org.id))
  const error = companies.error || contacts.error || automations.error
  if (error) return <Failure error={error} />
  if (!companies.data || !contacts.data || !automations.data) return <Loading />
  const stats = [
    { label: 'Companies', value: companies.data.length, note: 'Relationships in your pipeline' },
    { label: 'Contacts', value: contacts.data.length, note: 'People you work with' },
    { label: 'Active automations', value: automations.data.filter(item => item.is_active).length, note: 'Enabled rules in this workspace' },
  ]
  return <>
    <PageHeading title="A little more clarity." description={'Here is where things stand at ' + org.name + '.'} />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
      {stats.map(stat => <Paper variant="outlined" key={stat.label} sx={{ p: 3 }}>
        <Typography color="text.secondary" variant="body2">{stat.label}</Typography>
        <Typography variant="h3" sx={{ my: 2 }}>{stat.value}</Typography>
        <Typography color="text.secondary" variant="body2">{stat.note}</Typography>
      </Paper>)}
    </Box>
    <Paper sx={{ p: { xs: 3, md: 5 }, bgcolor: 'primary.dark', color: 'white', mb: 4, overflow: 'hidden' }}>
      <Chip label="MAKE ROOM FOR RELATIONSHIPS" size="small" sx={{ bgcolor: '#ffffff15', color: '#cfe6b4', mb: 3, letterSpacing: 1, fontSize: 10 }} />
      <Typography variant="h4" sx={{ mb: 2 }}>Your next connection starts here.</Typography>
      <Typography sx={{ maxWidth: 520, color: '#c8d8ce', mb: 3 }}>Keep track of the companies you know and the people behind them. Build your workspace one relationship at a time.</Typography>
      <Button component={Link} to={'/organizations/' + org.id + '/companies'} variant="contained" endIcon={<ArrowForwardRounded />} sx={{ bgcolor: '#d6eab9', color: '#183c33', '&:hover': { bgcolor: '#e3f2cd' } }}>Explore companies</Button>
    </Paper>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, justifyContent: 'space-between' }}>
      <Typography color="text.secondary" variant="body2">All figures reflect current workspace data.</Typography>
      <Typography color="text.secondary" variant="body2">Workspace / {org.name}</Typography>
    </Stack>
  </>
}
