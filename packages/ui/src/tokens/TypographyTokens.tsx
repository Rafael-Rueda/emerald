import React from "react";

interface TypographySampleProps {
  label: string;
  className: string;
  description: string;
}

function TypographySample({ label, className, description }: TypographySampleProps) {
  return (
    <div className="border-b border-border pb-4">
      <div className="flex items-baseline gap-3">
        <span className="min-w-[5rem] text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <p className={`text-foreground ${className}`}>
          The quick brown fox jumps over the lazy dog
        </p>
      </div>
      <p className="mt-1 pl-[5rem] text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/**
 * Visual preview of the Emerald typography scale.
 * Shows all Tailwind text size utilities plus the custom `text-2xs` token.
 */
export function TypographyTokens() {
  const samples: TypographySampleProps[] = [
    { label: "text-2xs", className: "text-2xs", description: "0.625rem / 0.875rem — Extra-extra-small (custom token)" },
    { label: "text-xs", className: "text-xs", description: "0.75rem / 1rem — Extra-small" },
    { label: "text-sm", className: "text-sm", description: "0.875rem / 1.25rem — Small" },
    { label: "text-base", className: "text-base", description: "1rem / 1.5rem — Base" },
    { label: "text-lg", className: "text-lg", description: "1.125rem / 1.75rem — Large" },
    { label: "text-xl", className: "text-xl", description: "1.25rem / 1.75rem — Extra-large" },
    { label: "text-2xl", className: "text-2xl", description: "1.5rem / 2rem — 2XL" },
    { label: "text-3xl", className: "text-3xl", description: "1.875rem / 2.25rem — 3XL" },
    { label: "text-4xl", className: "text-4xl", description: "2.25rem / 2.5rem — 4XL" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="mb-1 text-xl font-bold text-foreground">
          Typography Scale
        </h2>
        <p className="text-sm text-muted-foreground">
          Font sizes and line heights available in the design system. Uses{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            font-sans
          </code>{" "}
          (system-ui) as the default family and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            font-mono
          </code>{" "}
          (ui-monospace) for code.
        </p>
      </div>

      <div className="space-y-4">
        {samples.map((sample) => (
          <TypographySample key={sample.label} {...sample} />
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Font Families
        </h3>
        <div className="space-y-2">
          <p className="font-sans text-foreground">
            <span className="text-sm font-medium text-muted-foreground">
              font-sans:{" "}
            </span>
            The quick brown fox jumps over the lazy dog
          </p>
          <p className="font-mono text-foreground">
            <span className="text-sm font-medium text-muted-foreground">
              font-mono:{" "}
            </span>
            The quick brown fox jumps over the lazy dog
          </p>
        </div>
      </div>
    </div>
  );
}
