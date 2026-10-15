import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'

import type { EmailAccount } from '../../../types/organization.types'
import {
  createEmailAccountSchema,
  emailAccountSchema,
  type EmailAccountFormValues,
} from '../emailAccountSchema'

function getDefaultValues(account?: EmailAccount): EmailAccountFormValues {
  return {
    name: account?.name ?? '',
    host: account?.host ?? '',
    port: String(account?.port ?? 587),
    username: account?.username ?? '',
    password: '',
    from_email: account?.from_email ?? '',
    from_name: account?.from_name ?? '',
    security: account?.use_ssl ? 'ssl' : 'starttls',
  }
}

export function EmailAccountForm({
  account,
  save,
  cancel,
}: {
  account?: EmailAccount
  save: (body: Record<string, unknown>) => Promise<unknown>
  cancel: () => void
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EmailAccountFormValues>({
    resolver: zodResolver(account ? emailAccountSchema : createEmailAccountSchema),
    defaultValues: getDefaultValues(account),
  })

  async function submit(values: EmailAccountFormValues) {
    try {
      await save({
        name: values.name,
        host: values.host,
        port: Number(values.port),
        username: values.username,
        ...(values.password ? { password: values.password } : {}),
        from_email: values.from_email,
        from_name: values.from_name,
        use_tls: values.security === 'starttls',
        use_ssl: values.security === 'ssl',
        is_default: true,
        is_active: true,
      })
      cancel()
    } catch (caught) {
      setError('root', {
        message: caught instanceof Error ? caught.message : 'The connection could not be saved.',
      })
    }
  }

  const field = (
    name: Exclude<keyof EmailAccountFormValues, 'security'>,
    label: string,
    type = 'text',
  ) => (
    <TextField
      {...register(name)}
      label={label}
      type={type}
      required={name !== 'from_name' && !(name === 'password' && account)}
      error={Boolean(errors[name])}
      helperText={errors[name]?.message}
      disabled={isSubmitting}
    />
  )

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3, bgcolor: 'action.hover' }}>
      <Stack component="form" onSubmit={(event) => void handleSubmit(submit)(event)} spacing={2}>
        <Typography variant="h6">
          {account ? 'Edit SMTP connection' : 'New SMTP connection'}
        </Typography>
        {field('name', 'Connection name')}
        {field('host', 'SMTP hostname')}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {field('port', 'Port', 'number')}
          <Controller
            name="security"
            control={control}
            render={({ field: securityField }) => (
              <TextField
                {...securityField}
                select
                fullWidth
                label="Security"
                disabled={isSubmitting}
              >
                <MenuItem value="starttls">STARTTLS</MenuItem>
                <MenuItem value="ssl">SSL/TLS</MenuItem>
              </TextField>
            )}
          />
        </Stack>
        {field('username', 'SMTP username')}
        {field('password', account ? 'New SMTP password (optional)' : 'SMTP password', 'password')}
        {field('from_email', 'Sender email', 'email')}
        {field('from_name', 'Sender display name')}
        {errors.root?.message ? <Alert severity="error">{errors.root.message}</Alert> : null}
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save connection'}
          </Button>
          <Button onClick={cancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
