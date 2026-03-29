import * as React from "react"

import type { Control, FieldValues, Path } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export type CustomInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
  name: Path<TFieldValues>
  label: string
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"]
  placeholder?: string
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"]
  maxLength?: number
  autoComplete?: string
}

export function CustomInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  inputMode,
  maxLength,
  autoComplete,
}: CustomInputProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              inputMode={inputMode}
              maxLength={maxLength}
              autoComplete={autoComplete}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

