import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import { useCreateResource } from '../../hooks/useCreateResource'
import type { QueryKey } from '@tanstack/react-query'
export interface Field {
  name: string
  label: string
  required?: boolean
  type?: string
  maxLength?: number
  options?: { value: string; label: string }[]
}
export function CreateDialog({
  title,
  path,
  fields,
  invalidate,
  onClose,
}: {
  title: string
  path: string
  fields: Field[]
  invalidate: QueryKey
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const mutation = useCreateResource(path, invalidate, onClose)
  function submit(event: FormEvent) {
    event.preventDefault()
    const body = Object.fromEntries(fields.map((field) => [field.name, values[field.name] ?? '']))
    mutation.mutate(body)
  }
  return (
    <Dialog open onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
            {fields.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                required={field.required}
                name={field.name}
                type={field.type || 'text'}
                select={!!field.options}
                fullWidth
                value={values[field.name] ?? ''}
                disabled={mutation.isPending}
                slotProps={{ htmlInput: { maxLength: field.maxLength } }}
                onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              >
                {field.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
