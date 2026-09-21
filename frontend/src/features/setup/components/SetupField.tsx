import { TextField } from '@mui/material'
import type { TextFieldProps } from '@mui/material'
import { Controller, useFormContext } from 'react-hook-form'
import type { SetupFormValues } from '../setupSchema'

type TextFieldName = {
  [K in keyof SetupFormValues]: SetupFormValues[K] extends string ? K : never
}[keyof SetupFormValues]

type Props = Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'error'> & {
  name: TextFieldName
  onValueChange?: () => void
}

/** Keeps MUI input state and inline Zod errors consistent across setup steps. */
export function SetupField({ name, helperText, onValueChange, ...props }: Props) {
  const { control } = useFormContext<SetupFormValues>()
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          name={field.name}
          value={field.value}
          onBlur={field.onBlur}
          onChange={(event) => {
            field.onChange(event)
            onValueChange?.()
          }}
          inputRef={field.ref}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth
        />
      )}
    />
  )
}
