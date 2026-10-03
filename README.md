# Yourtab CMS — Phase 11

A TypeScript monorepo that provides a configurable Yourtab public site and an editor-oriented CMS workspace.

## Applications

- **`apps/api`** — Express CMS API backed by an atomic JSON document (`apps/api/data/cms.json`).
- **`apps/admin`** — Vite + React administration experience for site settings, homepage sections, banners, and custom pages.
- **`apps/web`** — Vite + React public experience which hydrates all visible content from the CMS API.

## Run locally

```bash
npm install
npm run dev:api
npm run dev:admin
npm run dev:web
```

The API listens on `http://localhost:4000`, the website on `http://localhost:5173`, and the admin studio on `http://localhost:5174`.

## CMS API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/cms/public` | Published frontend payload |
| GET/PUT | `/api/cms/settings` | Brand and theme settings |
| GET/PUT | `/api/cms/homepage-sections` | Hero, Featured, Trending sections |
| GET/PUT | `/api/cms/banners` | Announcement banners |
| GET/PUT | `/api/cms/pages` | Custom page collection |
| GET | `/api/cms/pages/:slug` | A custom page by URL slug |
