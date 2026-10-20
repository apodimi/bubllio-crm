import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Stack, TextField } from '@mui/material'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { timelineNoteSchema, type TimelineNoteFormValues } from '../companySchema'
import { useAddCompanyTimelineNote } from '../hooks/useCompanies'

interface CompanyNoteComposerProps {
  organizationId: string
  companyId: string
  onCancel: () => void
  onSuccess: () => void
}

export function CompanyNoteComposer({
  organizationId,
  companyId,
  onCancel,
  onSuccess,
}: CompanyNoteComposerProps) {
  const { t } = useTranslation()
  const addNote = useAddCompanyTimelineNote(organizationId, companyId)
  const form = useForm<TimelineNoteFormValues>({
    resolver: zodResolver(timelineNoteSchema),
    defaultValues: { body: '' },
  })

  useEffect(() => {
    if (addNote.isError) {
      form.setFocus('body')
    }
  }, [addNote.isError, form])

  async function submitNote(values: TimelineNoteFormValues) {
    try {
      await addNote.mutateAsync(values.body)
      form.reset()
      onSuccess()
    } catch {
      // The mutation state displays the API error and focus returns to the note field.
    }
  }

  return (
    <Box component="form" onSubmit={form.handleSubmit(submitNote)}>
      <Controller
        name="body"
        control={form.control}
        render={({ field: { ref, ...field }, fieldState }) => (
          <TextField
            {...field}
            inputRef={ref}
            autoFocus
            fullWidth
            multiline
            minRows={2}
            label={t('crm.companies.timeline.addNote')}
            placeholder={t('crm.companies.timeline.notePlaceholder')}
            error={Boolean(fieldState.error)}
            helperText={
              fieldState.error
                ? t('crm.companies.timeline.noteRequired')
                : t('crm.companies.timeline.noteHint')
            }
            disabled={addNote.isPending}
          />
        )}
      />
      {addNote.isError ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {addNote.error.message}
        </Alert>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
        <Button
          onClick={() => {
            form.reset()
            addNote.reset()
            onCancel()
          }}
          disabled={addNote.isPending}
          sx={{ minHeight: 44 }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={addNote.isPending}
          sx={{ minHeight: 44 }}
        >
          {addNote.isPending
            ? t('crm.companies.timeline.addingNote')
            : t('crm.companies.timeline.addNoteAction')}
        </Button>
      </Stack>
    </Box>
  )
}
