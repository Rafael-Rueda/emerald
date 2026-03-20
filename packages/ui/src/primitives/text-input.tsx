"use client";

import React from "react";
import { cn } from "../lib/cn";

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error message to display below the input. */
  error?: string;
  /** Label text above the input. */
  label?: string;
}

/**
 * A shared text input primitive with label and error state support.
 *
 * Supports keyboard focus with visible focus ring treatment.
 * Uses Tailwind design tokens for consistent styling.
 */
const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const inputId = id ?? React.useId();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-colors",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
TextInput.displayName = "TextInput";

export { TextInput };
