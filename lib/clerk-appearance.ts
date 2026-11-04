import type { ClerkAppearanceTheme } from "@clerk/nextjs/types";

/**
 * Clerk's prebuilt UI reads these values as CSS variables, so it follows the
 * same semantic palette as the rest of the app without a second theme system.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--accent)",
    colorPrimaryForeground: "var(--accent-foreground)",
    colorBackground: "var(--surface)",
    colorForeground: "var(--foreground)",
    colorMuted: "var(--surface-raised)",
    colorMutedForeground: "var(--muted)",
    colorNeutral: "var(--muted)",
    colorInput: "var(--surface-raised)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorDanger: "var(--danger)",
    colorRing: "var(--accent)",
    borderRadius: "6px",
    fontFamily: "var(--font-geist-sans)",
  },
} satisfies ClerkAppearanceTheme;
