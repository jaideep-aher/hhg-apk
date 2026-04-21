# HHG Farmers — Webapp (Next.js)

This folder holds the **Next.js site** that powers every content screen in the
Android app. The Android app is a Kotlin "shell" that hosts these pages inside
a WebView (see `android/app/src/main/java/com/hhg/farmers/ui/screens/web/`).

Adding a new page to the app is mostly a matter of adding a new route here —
no APK release required.

## What lives here

```
src/app/
  page.jsx                   → Aadhaar search (shown at `/`)
  about/                     → About page
  dailyrate/
    hundekari/page.jsx       → Hundekari market rates
    agrisight/page.jsx       → AI market trend
  farmers/[...farmerID]/     → Farmer transaction dashboard
  localvyapar/page.jsx       → Local Vyapar (seed/pesticide ad board)
  seeds/[...farmerid]/       → Seeds catalog

src/components/ui/           → Radix + shadcn primitives
src/lib/                     → AI service, grouping helpers, PostHog shim
src/server/                  → DB query functions (used via server actions)
```

## Local development

```bash
cd android/webapp
cp .env.example .env.local   # then fill in the real values
pnpm install
pnpm dev                     # http://localhost:3000
```

## Deploying to Railway

The Android app expects this site at the URL configured in `GET /api/config`'s
`webBaseUrl` field (Express backend in `android/backend/`). The temporary
default while you pick a final domain is `https://1.aher.dev`.

1. In Railway, **create a new service** in the same project as your Express
   backend.
2. **Root directory**: `android/webapp` (so Railway only builds this folder).
3. **Build command** (auto-detected) — or explicitly `pnpm install && pnpm build`.
4. **Start command** — `pnpm start`.
5. **Variables**: copy every key from `.env.example` and paste the real values.
6. **Custom domain**: `1.aher.dev` (temporary) → later change to your production
   domain. Railway gives you a CNAME; add it at your DNS provider.
7. Set `WEB_BASE_URL` on the Express backend's service to whatever custom
   domain you pick. The next app launch picks up the change with no rebuild.

## Why it's in this repo

Two reasons:

1. The app build can reference the exact site contract it expects (URL
   structure, bridge names) from the same commit, avoiding the cross-repo
   skew that used to bite us.
2. Railway can build either service from a single repo using its "root
   directory" feature, so you only need one GitHub integration.

## DO NOT commit

`.env`, `.env.local`, `.env.*.local` — anything with real credentials. The
webapp's own `.gitignore` already covers these, but double-check before every
`git add -A`.
