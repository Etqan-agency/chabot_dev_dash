# click.ai Console

A React + Vite + TypeScript dashboard for a **multi-tenant RAG chatbot** backend
(Django REST). See [`api-docs.html`](./api-docs.html) for the API reference.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a custom brand theme (amber / navy / steel / cream) + dark mode
- **React Router 7** for routing
- **TanStack Query** for server state
- **Axios** API client with JWT auth + automatic token refresh
- **i18n**: English + Arabic (RTL)

## Getting started

```bash
npm install
cp .env.example .env   # optional; defaults use the Vite dev proxy
npm run dev
```

The dev server runs at http://localhost:5173 and proxies `/api` to the backend
(`https://chatbot-api.zaychain.com` by default). Override the target
with `VITE_API_PROXY_TARGET`, or point directly at a deployed API with `VITE_API_BASE_URL`.

## Scripts

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server                 |
| `npm run build`   | Type-check and build for production  |
| `npm run preview` | Preview the production build         |

## Deployment (Vercel)

[`vercel.json`](./vercel.json) proxies `/api/*` to the backend (no CORS needed) and adds
the SPA fallback for client-side routing. Keep `VITE_API_BASE_URL` empty in production so
requests stay relative and flow through the proxy.

## Project structure

```
src/
  components/      UI primitives, layout (sidebar/topbar), chat, admin, route guards
  context/         Auth, Theme, Locale providers
  hooks/           useAuth, useTheme, useI18n, useDebounce, useClipboard
  i18n/            EN/AR translations
  lib/             axios client, typed endpoints, token store, formatters
  pages/           Login, Dashboard, Analytics, Chat, Documents, API sync,
                   Bot identity, and admin/ (Users, API keys, Plans, Subscriptions, Tenants)
  types/           API models mirrored from api-docs.html
```

## What's built

- **Auth** — JWT login, session restore, protected + admin-only routes.
- **Dashboard** — live KPIs and quota consumption.
- **Analytics** — usage breakdown by period (all-time / month / today) + quota.
- **Chat** — modern messaging UI with a live video avatar, Markdown answers, sources & feedback.
- **Bot-Knowledge** — Documents (upload, manage) and API content sync.
- **Bot identity** — edit the assistant's name, company, tone and language.
- **Admin** — Users, API keys, Plans, Subscriptions, all-tenant analytics.
- **Theme** — light/dark mode. **Language** — English/Arabic with full RTL.
