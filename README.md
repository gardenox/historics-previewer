# Pulsar Historics Manifest

A single-page tool for creating and previewing Pulsar/TRAC historics, deployable directly on Vercel.

## Structure

- `index.html` — the tool itself (source-gated category picker, calendar date range, multi-search cards, live polling)
- `api/graphql.js` — a Vercel serverless function that proxies GraphQL calls to `trac.pulsarplatform.com`. Pulsar's API doesn't send CORS headers, so the browser can't call it directly; this function runs server-side (no CORS involved) and the browser calls it at `/api/graphql` on the same domain instead.

## Deploy

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import Git Repository** → select this repo → Deploy. No build settings or environment variables are required — Vercel auto-detects the static `index.html` and the function in `api/`.
3. Open the deployed URL, paste your Pulsar bearer token, and go. The "API endpoint" field defaults to `/api/graphql`, which is correct for this setup and shouldn't need changing.

## Notes

- **Nothing is stored server-side.** Your bearer token lives only in the browser tab's memory for that session (re-enter it if you reload), and is forwarded per-request through the serverless function — it's never written to a database, log, or environment variable.
- **Local development:** running `vercel dev` in this folder will serve both the static page and the function locally, same as production. Opening `index.html` directly as a file (without `vercel dev` or a deployment) won't work, since there's no server behind it to handle `/api/graphql` — for that, use the standalone `pulsar-proxy.js` script instead and point the "API endpoint" field at wherever that's running.
- If Pulsar ever adds CORS headers for your domain, you could point "API endpoint" straight at `https://trac.pulsarplatform.com/graphql` and skip the function entirely — but there's no downside to leaving the proxy in place either way.
