import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Chip, Paper, Stack, TextField, Typography, Box } from '@mui/material'
import { z } from 'zod'

import type { EmailAccount } from '../../../types/organization.types'
import { testRecipientSchema } from '../emailAccountSchema'

const recipientFormSchema = z.object({ recipient: testRecipientSchema })
type RecipientFormValues = z.infer<typeof recipientFormSchema>

export function EmailAccountCard({
  account,
  canManage,
  makeDefault,
  remove,
  edit,
  test,
}: {
  account: EmailAccount
  canManage: boolean
  makeDefault: () => void
  remove: () => void
  edit: () => void
  test: (recipient: string) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipientFormValues>({
    resolver: zodResolver(recipientFormSchema),
    defaultValues: { recipient: '' },
  })

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{account.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {account.host}:{account.port} · {account.from_email}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={account.is_default ? 'primary' : 'default'}
            label={account.is_default ? 'Default' : 'Available'}
          />
        </Stack>
        {account.last_test_error ? (
          <Alert severity="warning">The last delivery test failed.</Alert>
        ) : null}
        {canManage ? (
          <>
            <Stack direction="row" spacing={1}>
              {!account.is_default ? (
                <Button size="small" onClick={makeDefault}>
                  Make default
                </Button>
              ) : null}
              <Button size="small" onClick={edit}>
                Edit
              </Button>
              <Button size="small" color="error" onClick={remove}>
                Delete
              </Button>
            </Stack>
            <Stack
              component="form"
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ pt: 1 }}
              onSubmit={(event) => void handleSubmit(({ recipient }) => test(recipient))(event)}
            >
              <TextField
                {...register('recipient')}
                size="small"
                label="Test recipient"
                error={Boolean(errors.recipient)}
                helperText={errors.recipient?.message}
                sx={{ flex: 1 }}
              />
              <Button size="small" variant="outlined" type="submit">
                Send test
              </Button>
            </Stack>
          </>
        ) : null}
      </Stack>
    </Paper>
  )
}
