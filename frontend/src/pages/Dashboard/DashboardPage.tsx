import { Link } from '@tanstack/react-router'
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { alpha, lighten } from '@mui/material/styles'
import { useAutomations } from '../../features/automations'
import { useCompanies } from '../../features/companies'
import { useContacts } from '../../features/contacts'
import { useWorkspace } from '../../features/organizations'
import { useSubscriptionOverview } from '../../features/subscriptions'
import { useTasks } from '../../features/tasks'
import { Failure, Loading, PageHeading } from '../../components/common/Feedback'

export function DashboardPage() {
  const org = useWorkspace()
  const companies = useCompanies(org.id)
  const contacts = useContacts(org.id)
  const automations = useAutomations(org.id)
  const billing = useSubscriptionOverview(org.id)
  const todayTasks = useTasks(org.id, { bucket: 'today', assignedTo: 'me' })
  const overdueTasks = useTasks(org.id, { bucket: 'overdue', assignedTo: 'me' })
  const error =
    companies.error ||
    contacts.error ||
    automations.error ||
    billing.error ||
    todayTasks.error ||
    overdueTasks.error
  if (error) return <Failure error={error} />
  if (
    !companies.data ||
    !contacts.data ||
    !automations.data ||
    !billing.data ||
    !todayTasks.data ||
    !overdueTasks.data
  )
    return <Loading />
  const stats = [
    { label: 'Companies', value: companies.data.length, note: 'Relationships in your pipeline' },
    { label: 'Contacts', value: contacts.data.length, note: 'People you work with' },
    {
      label: 'Active automations',
      value: automations.data.filter((item) => item.is_active).length,
      note: 'Enabled rules in this workspace',
    },
  ]
  const moneyByCurrency = (values: Record<string, string>) => {
    const entries = Object.entries(values)
    if (!entries.length) return '—'
    return entries
      .map(
        ([currency, value]) =>
          `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`,
      )
      .join(' · ')
  }
  return (
    <>
      <PageHeading
        title="A little more clarity."
        description={'Here is where things stand at ' + org.name + '.'}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '1.15fr .9fr .9fr' },
          gap: 3,
          mb: 4,
        }}
      >
        {stats.map((stat) => (
          <Paper
            variant="outlined"
            key={stat.label}
            sx={{
              p: 3.25,
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: '50%',
                right: -28,
                top: -32,
                bgcolor: 'action.selected',
              },
            }}
          >
            <Typography color="text.secondary" variant="body2">
              {stat.label}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                my: 2,
                fontSize: 44,
                fontVariantNumeric: 'tabular-nums',
                color: 'primary.dark',
              }}
            >
              {stat.value}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {stat.note}
            </Typography>
          </Paper>
        ))}
      </Box>
      <Paper variant="outlined" sx={{ mb: 4, overflow: 'hidden' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          divider={<Divider orientation="vertical" flexItem />}
        >
          <Box sx={{ p: { xs: 3, md: 4 }, flex: 1 }}>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2.5 }}
            >
              <Box>
                <Typography variant="h5">Your next actions</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  Work due today and follow-ups that need attention.
                </Typography>
              </Box>
              <Link
                to="/organizations/$organizationId/tasks"
                params={{ organizationId: org.id }}
                style={{ textDecoration: 'none' }}
              >
                <Button component="span" endIcon={<ArrowForwardRounded />}>
                  Open tasks
                </Button>
              </Link>
            </Stack>
            {todayTasks.data.length ? (
              <Stack divider={<Divider />}>
                {todayTasks.data.slice(0, 4).map((task) => (
                  <Stack
                    key={task.id}
                    direction="row"
                    sx={{ justifyContent: 'space-between', gap: 2, py: 1.25 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }} noWrap>
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {task.company_name}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(task.due_at))}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Nothing else due today.</Typography>
            )}
          </Box>
          <Box
            sx={(theme) => ({
              p: { xs: 3, md: 4 },
              minWidth: { md: 280 },
              bgcolor: overdueTasks.data.length
                ? alpha(theme.palette.error.main, 0.055)
                : theme.palette.action.hover,
            })}
          >
            <Typography color="text.secondary" variant="body2">
              Overdue follow-ups
            </Typography>
            <Typography
              variant="h3"
              color={overdueTasks.data.length ? 'error.main' : 'text.primary'}
              sx={{ my: 1.5, fontVariantNumeric: 'tabular-nums' }}
            >
              {overdueTasks.data.length}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {overdueTasks.data.length
                ? 'Open the list and decide the next action.'
                : 'You are caught up.'}
            </Typography>
          </Box>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ mb: 4, overflow: 'hidden' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          divider={<Divider orientation="vertical" flexItem />}
        >
          <Box sx={{ p: { xs: 3, md: 4 }, flex: 1.25 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ justifyContent: 'space-between', gap: 2, mb: 3 }}
            >
              <Box>
                <Typography variant="h5">Revenue & collections</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  Net recurring value and actual payments, kept separate by currency.
                </Typography>
              </Box>
              <Link
                to="/organizations/$organizationId/services"
                params={{ organizationId: org.id }}
                style={{ textDecoration: 'none' }}
              >
                <Button component="span" endIcon={<ArrowForwardRounded />}>
                  Open billing
                </Button>
              </Link>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 3,
              }}
            >
              <Box>
                <Typography color="text.secondary" variant="body2">
                  Monthly recurring revenue
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {moneyByCurrency(billing.data.monthly_recurring_revenue)}
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  Net recurring value normalized per month
                </Typography>
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">
                  Collected this month
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {moneyByCurrency(billing.data.collected_this_month)}
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  Payments recorded since the first of the month
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: { xs: 3, md: 4 }, flex: 0.75, bgcolor: 'action.hover' }}>
            <Typography variant="h6" sx={{ mb: 2.5 }}>
              Billing attention
            </Typography>
            <Stack divider={<Divider />}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.25 }}>
                <Typography color="text.secondary">Open balance</Typography>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {moneyByCurrency(billing.data.open_balances)}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.25 }}>
                <Typography color="text.secondary">Overdue</Typography>
                <Typography
                  color={billing.data.overdue_charges ? 'error.main' : 'text.primary'}
                  sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                >
                  {billing.data.overdue_charges} · {moneyByCurrency(billing.data.overdue_balances)}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.25 }}>
                <Typography color="text.secondary">Active subscriptions</Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {billing.data.active_subscriptions}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.25 }}>
                <Typography color="text.secondary">Renewals in 30 days</Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {billing.data.renewals_next_30_days}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.25 }}>
                <Typography color="text.secondary">Ending at period close</Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {billing.data.scheduled_cancellations}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Paper>
      <Paper
        sx={{
          p: { xs: 3, md: 5 },
          background: 'linear-gradient(125deg, #0f1f38 0%, #005bef 62%, #1473ff 125%)',
          color: 'primary.contrastText',
          mb: 4,
          overflow: 'hidden',
          borderRadius: 3.5,
          boxShadow: '0 24px 64px rgba(15,31,56,.18)',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 360,
            height: 360,
            borderRadius: '50%',
            right: -110,
            top: -230,
            bgcolor: 'rgba(255,255,255,.07)',
          },
        }}
      >
        <Chip
          label="MAKE ROOM FOR RELATIONSHIPS"
          size="small"
          sx={(theme) => ({
            bgcolor: alpha(theme.palette.primary.contrastText, 0.08),
            color: 'primary.light',
            mb: 3,
            letterSpacing: 1,
            fontSize: 10,
          })}
        />
        <Typography variant="h4" sx={{ mb: 2 }}>
          Your next connection starts here.
        </Typography>
        <Typography sx={{ maxWidth: 520, color: 'primary.light', mb: 3, opacity: 0.82 }}>
          Keep track of the companies you know and the people behind them. Build your workspace one
          relationship at a time.
        </Typography>
        <Link
          to="/organizations/$organizationId/companies"
          params={{ organizationId: org.id }}
          search={{ company: undefined }}
          style={{ textDecoration: 'none' }}
        >
          <Button
            component="span"
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            sx={(theme) => ({
              bgcolor: 'primary.light',
              color: 'primary.dark',
              '&:hover': { bgcolor: lighten(theme.palette.primary.light, 0.18) },
            })}
          >
            Explore companies
          </Button>
        </Link>
      </Paper>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 2, justifyContent: 'space-between' }}
      >
        <Typography color="text.secondary" variant="body2">
          All figures reflect current workspace data.
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Workspace / {org.name}
        </Typography>
      </Stack>
    </>
  )
}
