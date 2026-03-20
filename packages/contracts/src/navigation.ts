import { z } from "zod";

/**
 * Zod contracts for sidebar navigation tree.
 */

export interface NavigationItem {
  id: string;
  label: string;
  slug: string;
  children: NavigationItem[];
}

export const NavigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    slug: z.string(),
    children: z.array(NavigationItemSchema),
  }),
);

export const NavigationTreeSchema = z.object({
  space: z.string(),
  version: z.string(),
  items: z.array(NavigationItemSchema),
});

export const NavigationResponseSchema = z.object({
  navigation: NavigationTreeSchema,
});

export type NavigationTree = z.infer<typeof NavigationTreeSchema>;
export type NavigationResponse = z.infer<typeof NavigationResponseSchema>;
