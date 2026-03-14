"use client";

import * as React from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Check, X } from "lucide-react";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
  showRealtimeValidation?: boolean;
};

function validatePassword(password: string): {
  minLength: boolean;
  alphanumeric: boolean;
} {
  return {
    minLength: password.length >= 8,
    alphanumeric: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/.test(password),
  };
}

export function PasswordInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "••••••••",
  showRealtimeValidation = true,
}: PasswordInputProps<TFieldValues>) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const hints = showRealtimeValidation
          ? validatePassword(field.value)
          : null;

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={placeholder}
                  {...field}
                  className={cn(
                    showRealtimeValidation && "pr-20"
                  )}
                />
                {field.value && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                )}
              </div>
            </FormControl>
            {showRealtimeValidation && field.value && hints && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center gap-2 text-[11px]">
                  {hints.minLength ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span
                    className={
                      hints.minLength
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }
                  >
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  {hints.alphanumeric ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span
                    className={
                      hints.alphanumeric
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }
                  >
                    Letters and numbers only
                  </span>
                </div>
              </div>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
