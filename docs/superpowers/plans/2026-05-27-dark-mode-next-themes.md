# Dark Mode: next-themes Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up class-based dark mode in `apps/web` by adding `next-themes` and a `Providers` wrapper so the `.dark` selector in `globals.css` activates correctly based on OS preference.

**Architecture:** A new `'use client'` component (`providers.tsx`) wraps the app's children with `ThemeProvider`. The root layout stays a Server Component and delegates all client-side provider setup to this wrapper. `next-themes` sets `class="dark"` on `<html>` to match the existing `.dark { ... }` block in `globals.css`.

**Tech Stack:** Next.js 16 App Router, React 19, next-themes, TypeScript

---

### Task 1: Add `next-themes` dependency

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add `next-themes` to dependencies**

Edit `apps/web/package.json` — add `"next-themes": "^0.4.6"` to the `dependencies` block:

```json
"dependencies": {
  "@saas/ui": "workspace:*",
  "clsx": "^2.1.1",
  "next": "16.2.0",
  "next-themes": "^0.4.6",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "tailwind-merge": "^3.6.0"
},
```

- [ ] **Step 2: Install the new dependency**

Run from the repo root:

```bash
pnpm install
```

Expected: lock file updated, `next-themes` visible under `apps/web` in `node_modules`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add next-themes dependency"
```

---

### Task 2: Create `providers.tsx` Client Component

**Files:**
- Create: `apps/web/app/providers.tsx`

- [ ] **Step 1: Create the file**

Create `apps/web/app/providers.tsx` with this exact content:

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

Props:
- `attribute="class"` — writes `class="dark"` on `<html>`, matching the `.dark { ... }` selector in `globals.css`
- `defaultTheme="system"` — follows OS preference by default
- `enableSystem` — allows the "system" theme to read `prefers-color-scheme`

- [ ] **Step 2: Verify types pass**

```bash
pnpm --filter=web check-types
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/providers.tsx
git commit -m "feat(web): add Providers client component with ThemeProvider"
```

---

### Task 3: Wire `Providers` into the root layout

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Update `layout.tsx`**

Replace the full contents of `apps/web/app/layout.tsx` with:

```tsx
// CSS imports first — required for correct Tailwind v4 cascade order
import './globals.css'

import type { Metadata } from 'next'
import localFont from 'next/font/local'

import { Providers } from './providers'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'next-saas-rbac',
  description: '',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

Key changes from the current file:
- Added `import { Providers } from './providers'`
- Added `suppressHydrationWarning` to `<html>` — prevents React hydration mismatch since `next-themes` injects the class attribute client-side after SSR
- Wrapped `{children}` with `<Providers>`

- [ ] **Step 2: Verify types pass**

```bash
pnpm --filter=web check-types
```

Expected: no errors.

- [ ] **Step 3: Verify lint passes**

```bash
pnpm --filter=web lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "feat(web): wire ThemeProvider into root layout for dark mode support"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
pnpm --filter=web dev
```

Open `http://localhost:3000` in a browser.

- [ ] **Step 2: Verify dark mode activates with OS preference**

In your OS, switch to dark mode. The page background should change from white (`oklch(1 0 0)`) to near-black (`oklch(0.145 0 0)`).

In browser DevTools → Elements, confirm `<html>` has `class="dark"` when OS is in dark mode, and no dark class when in light mode.

- [ ] **Step 3: Verify no hydration warnings in the browser console**

Open the browser console. There should be no React hydration mismatch warnings.
