# Dark Mode: next-themes Integration

**Date:** 2026-05-27
**Status:** Approved

## Problem

`apps/web/app/globals.css` defines dark mode variables under a `.dark` selector (shadcn/ui class-based pattern), but nothing in the codebase sets that class on `<html>`. Dark mode CSS variables are unreachable, so dark mode never activates.

## Goal

Wire up class-based dark mode in `apps/web` so that:
- The app respects the OS/system preference by default
- The `.dark` class on `<html>` is managed automatically by `next-themes`
- The root layout stays a Server Component (App Router best practice)

## Design

### Package

Add `next-themes` to `apps/web` dependencies.

### New file: `apps/web/app/providers.tsx`

A `'use client'` wrapper component that hosts all client-side providers. For now, only `ThemeProvider` from `next-themes`.

```tsx
'use client'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

- `attribute="class"` — writes the `class="dark"` attribute on `<html>`, matching the existing `.dark` selector in `globals.css`
- `defaultTheme="system"` + `enableSystem` — follows OS preference by default

### Updated: `apps/web/app/layout.tsx`

Two targeted changes:
1. Add `suppressHydrationWarning` to `<html>` — prevents React hydration mismatch caused by `next-themes` injecting the class attribute server-side vs client-side
2. Wrap `{children}` with `<Providers>`

### No CSS changes

`globals.css` already has the correct `.dark { ... }` block. No changes needed.

## Files

| Action | File |
|--------|------|
| Modify | `apps/web/package.json` — add `next-themes` |
| Create | `apps/web/app/providers.tsx` |
| Modify | `apps/web/app/layout.tsx` |

## Out of scope

- Theme toggle UI (button/switch) — not needed to fix the bug; can be added later
- Dark mode in `apps/docs` — that app has no Tailwind setup
