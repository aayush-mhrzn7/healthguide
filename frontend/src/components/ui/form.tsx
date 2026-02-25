import * as React from "react"

import { Slot } from "radix-ui"
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/lib/utils"

export type FormProps<TFieldValues extends FieldValues = FieldValues> =
  React.ComponentProps<"form"> & {
    methods: ReturnType<typeof useFormContext<TFieldValues>> | any
  }

function Form<TFieldValues extends FieldValues>({
  methods,
  className,
  ...props
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...methods}>
      <form
        className={className}
        {...props}
      />
    </FormProvider>
  )
}

const FormFieldContext = React.createContext<{
  name: string
} | null>(null)

function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  props: ControllerProps<TFieldValues, TName>,
) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const fieldState = getFieldState(fieldContext.name, formState)

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    ...fieldState,
  }
}

const FormItemContext = React.createContext<{ id: string }>({ id: "" })

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function FormItem({ className, ...props }, ref) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        ref={ref}
        className={cn("space-y-1.5", className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
})

const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function FormLabel({ className, ...props }, ref) {
  const { formItemId } = useFormField()

  return (
    <label
      ref={ref}
      htmlFor={formItemId}
      className={cn(
        "block text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
})

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot.Root>,
  React.ComponentPropsWithoutRef<typeof Slot.Root>
>(function FormControl({ ...props }, ref) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot.Root
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function FormDescription({ className, ...props }, ref) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[11px] text-muted-foreground", className)}
      {...props}
    />
  )
})

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function FormMessage({ className, children, ...props }, ref) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message) : children

  if (!body) return null

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-[11px] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
}

