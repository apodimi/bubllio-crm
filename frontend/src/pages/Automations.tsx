import { useQuery } from '@tanstack/react-query'
import { Alert, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { automationsQuery, runsQuery } from '../api/queries'
import { useWorkspace } from '../app/workspace'
import { Empty, Failure, Loading, PageHeading } from '../components/Feedback'
export function Automations() {
  const org = useWorkspace()
  const rules = useQuery(automationsQuery(org.id))
  const runs = useQuery(runsQuery(org.id))
  const error = rules.error || runs.error
  return <>
    <PageHeading title="Automations" description="Your rules and their execution history." />
    <Alert severity="info" sx={{ mb: 3 }}>Currently, only company creation triggers automatic execution. Email actions use the backend's configured global email transport. The visual workflow builder is planned.</Alert>
    {error ? <Failure error={error} /> : !rules.data || !runs.data ? <Loading /> : <>
      <Paper variant="outlined" sx={{ mb: 4 }}>{rules.data.length === 0 ? <Empty title="No automations yet" description="Rules created through the API or Django admin will appear here." /> :
        <TableContainer><Table><TableHead><TableRow><TableCell>Rule</TableCell><TableCell>Trigger</TableCell><TableCell>Action</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
          <TableBody>{rules.data.map(rule => <TableRow key={rule.id}><TableCell>{rule.name}</TableCell><TableCell>{rule.trigger}{rule.trigger !== 'company.created' && ' (not wired)'}</TableCell><TableCell>{rule.action_type}</TableCell><TableCell><Chip size="small" label={rule.is_active ? 'Enabled' : 'Inactive'} variant="outlined" /></TableCell></TableRow>)}</TableBody>
        </Table></TableContainer>}
      </Paper>
      <Typography variant="h6" sx={{ mb: 2 }}>Run history</Typography>
      <Paper variant="outlined">{runs.data.length === 0 ? <Empty title="No runs recorded" description="Execution results will appear here when your rules run." /> :
        <TableContainer><Table><TableHead><TableRow><TableCell>Rule</TableCell><TableCell>Result</TableCell><TableCell>Time</TableCell></TableRow></TableHead>
          <TableBody>{runs.data.map(run => <TableRow key={run.id}><TableCell>{rules.data.find(rule => rule.id === run.automation)?.name || run.automation}</TableCell><TableCell><Chip size="small" label={run.status} color={run.status === 'success' ? 'success' : run.status === 'failed' ? 'error' : 'default'} variant="outlined" /></TableCell><TableCell>{new Date(run.created_at).toLocaleString()}</TableCell></TableRow>)}</TableBody>
        </Table></TableContainer>}
      </Paper>
    </>}
  </>
}
