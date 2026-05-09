# Sudoku Evolved — Website

Next.js App Router project that serves [sudokuevolved.com](https://sudokuevolved.com) — the
official cinematic web portal for the Sudoku Evolved iOS app.

This project lives **alongside** the Expo / React Native iOS app at the repo root. The Expo
build pipeline is untouched.

## What this site does

- Premium dark-only marketing homepage that mirrors the app's branding 1:1
- Duel invite landing pages (`/duel/[inviteCode]`) with iOS Universal Links + scheme fallback
- Public profile pages (`/u/[username]`) backed by the same Supabase project as the app
- Public leaderboards (`/leaderboards`)
- App Store-ready legal pages (`/privacy`, `/terms`, `/support`, `/delete-account`)
- Apple App Site Association at `/.well-known/apple-app-site-association`
- Android App Links scaffold at `/.well-known/assetlinks.json`

## Development

```bash
cd web
npm install
cp .env.example .env.local   # fill in any vars you have; leaving them blank is fine
npm run dev
```

Without env vars, every Supabase-backed page renders a graceful fallback. With env vars set,
it pulls from the same Supabase project the app uses.

## Tech

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 (CSS-first `@theme` config)
- Framer Motion for tasteful, reduced-motion-aware animation
- Supabase JS client (anon key only — never service role)

## Deployment

See [`/docs/website-deployment.md`](../docs/website-deployment.md) for the full Vercel +
Supabase + Universal Links setup checklist.
