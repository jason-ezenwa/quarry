# Deploying the web app to Cloudflare

The web app is a static Vite build served from Cloudflare Workers as static
assets (`apps/web/wrangler.jsonc`). There is no Worker script, so asset
requests are free and unmetered on the free plan. The API runs separately on
Render.

## Workers Builds settings

In the Cloudflare dashboard, open the Worker, then **Settings → Build**:

| Setting | Value |
| --- | --- |
| Root directory | `/` (the repo root, so the workspace installs and builds) |
| Build command | `pnpm turbo run build --filter=web` |
| Deploy command | `pnpm --filter web run deploy` |
| Non-production branch deploy command | `pnpm --filter web exec wrangler versions upload` |

The Worker's name in the dashboard must match `name` in
`apps/web/wrangler.jsonc` (`quarry`).

Under **Settings → Build → Variables and secrets** add these build variables.
Vite inlines `VITE_*` values at build time, so they go here, not under the
Worker's runtime variables.

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | The API's public origin, e.g. `https://api.example.com` (no trailing slash, no `/api`) |
| `MONGOMS_DISABLE_POSTINSTALL` | `1` (skips the 120 MB test MongoDB download) |

## Server settings

On Render, set `FRONTEND_URL` to the web app's origin. CORS and Better Auth
only accept requests from that origin.

## Cookies need the same site

Better Auth's session cookie is `SameSite=Lax`, so the browser only sends it
when the web app and the API are on the same site. `*.workers.dev` and
`*.onrender.com` are different sites, so sign-in will not stick between them.
Serve both from subdomains of one domain you own, for example
`app.example.com` on Cloudflare and `api.example.com` on Render.
