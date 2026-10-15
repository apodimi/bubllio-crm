import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material'

import type { WorkspaceSettings } from '../../../types/organization.types'
import { workspaceSettingsSchema } from '../workspaceSettingsSchema'
import type { SettingsField, SettingsFieldGroup } from './settings.types'

export function WorkspaceSettingsForm({
  initial,
  fields,
  groups,
  save,
  readOnly,
}: {
  initial: WorkspaceSettings
  fields?: SettingsField[]
  groups?: SettingsFieldGroup[]
  save: (values: Partial<WorkspaceSettings>) => Promise<unknown>
  readOnly: boolean
}) {
  const formFields = fields ?? groups?.flatMap((group) => group.fields) ?? []
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
  } = useForm<WorkspaceSettings>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: initial,
  })

  async function submit(values: WorkspaceSettings) {
    const changedSection = Object.fromEntries(formFields.map(({ name }) => [name, values[name]]))
    try {
      await save(changedSection)
    } catch {
      setError('root', {
        message: 'The changes could not be saved. Review the fields and try again.',
      })
    }
  }

  return (
    <Box component="form" onSubmit={(event) => void handleSubmit(submit)(event)}>
      <Stack spacing={3} divider={groups ? <Divider /> : undefined}>
        {(groups ?? [{ title: '', description: '', fields: formFields }]).map((group) => (
          <Stack key={group.title || 'fields'} spacing={2}>
            {group.title ? (
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{group.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {group.description}
                </Typography>
              </Box>
            ) : null}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              {group.fields.map((settingsField) => (
                <Controller
                  key={settingsField.name}
                  name={settingsField.name}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ''}
                      label={settingsField.label}
                      type={settingsField.type ?? 'text'}
                      select={Boolean(settingsField.options)}
                      error={Boolean(errors[settingsField.name])}
                      helperText={errors[settingsField.name]?.message ?? settingsField.helper}
                      sx={{ gridColumn: settingsField.wide ? '1 / -1' : undefined }}
                      disabled={readOnly || isSubmitting}
                      onChange={(event) => {
                        const value =
                          settingsField.type === 'number'
                            ? Number(event.target.value)
                            : event.target.value
                        field.onChange(value)
                      }}
                    >
                      {settingsField.options?.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              ))}
            </Box>
          </Stack>
        ))}
      </Stack>
      <Stack spacing={1.5} sx={{ mt: 2.5, alignItems: 'flex-start' }}>
        {readOnly ? (
          <Alert severity="info" sx={{ width: '100%' }}>
            Only workspace owners and admins can change these settings.
          </Alert>
        ) : null}
        {isSubmitSuccessful && !errors.root ? (
          <Alert severity="success" sx={{ width: '100%' }}>
            Changes saved.
          </Alert>
        ) : null}
        {errors.root?.message ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            {errors.root.message}
          </Alert>
        ) : null}
        {!readOnly ? (
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        ) : null}
      </Stack>
    </Box>
  )
}
