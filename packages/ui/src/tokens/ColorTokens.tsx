import React from "react";

interface ColorSwatchProps {
  name: string;
  variable: string;
  foregroundVariable?: string;
}

function ColorSwatch({ name, variable, foregroundVariable }: ColorSwatchProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 rounded-md border border-border"
        style={{ backgroundColor: `hsl(var(${variable}))` }}
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <code className="text-xs text-muted-foreground">{variable}</code>
        {foregroundVariable && (
          <div className="mt-1 flex items-center gap-1">
            <div
              className="h-4 w-4 rounded border border-border"
              style={{ backgroundColor: `hsl(var(${foregroundVariable}))` }}
            />
            <code className="text-xs text-muted-foreground">
              {foregroundVariable}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Visual preview of the Emerald color token palette.
 * Shows all semantic color roles defined as CSS custom properties.
 */
export function ColorTokens() {
  const colorPairs: ColorSwatchProps[] = [
    { name: "Background", variable: "--background" },
    { name: "Foreground", variable: "--foreground" },
    {
      name: "Primary",
      variable: "--primary",
      foregroundVariable: "--primary-foreground",
    },
    {
      name: "Secondary",
      variable: "--secondary",
      foregroundVariable: "--secondary-foreground",
    },
    {
      name: "Muted",
      variable: "--muted",
      foregroundVariable: "--muted-foreground",
    },
    {
      name: "Accent",
      variable: "--accent",
      foregroundVariable: "--accent-foreground",
    },
    {
      name: "Destructive",
      variable: "--destructive",
      foregroundVariable: "--destructive-foreground",
    },
    {
      name: "Card",
      variable: "--card",
      foregroundVariable: "--card-foreground",
    },
    {
      name: "Popover",
      variable: "--popover",
      foregroundVariable: "--popover-foreground",
    },
    { name: "Border", variable: "--border" },
    { name: "Input", variable: "--input" },
    { name: "Ring", variable: "--ring" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="mb-1 text-xl font-bold text-foreground">
          Color Roles
        </h2>
        <p className="text-sm text-muted-foreground">
          Semantic color tokens used across the design system. Each role maps
          to a CSS custom property with HSL channel values, consumed via{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            hsl(var(--token))
          </code>{" "}
          in the Tailwind preset.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {colorPairs.map((pair) => (
          <ColorSwatch key={pair.variable} {...pair} />
        ))}
      </div>
    </div>
  );
}
