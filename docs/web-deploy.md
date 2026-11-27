# Deploying the web app to Cloudflare Pages

The web app is a static Vite build served by Cloudflare Pages (free, with
unlimited static requests). The API runs separately on Render. Both sit on
subdomains of one domain whose DNS stays at its current registrar.

## 1. Create the Pages project

In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
Import an existing Git repository**, pick this repo and set:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Root directory | `/` (the repo root, so the workspace installs and builds) |
| Build command | `pnpm turbo run build --filter=web` |
| Build output directory | `apps/web/dist` |

Add these environment variables (Vite inlines `VITE_*` values at build time):

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | The API's origin, e.g. `https://api.quarry.example.com` (no trailing slash, no `/api`) |
| `NODE_VERSION` | `24` |
| `PNPM_VERSION` | `10.20.0` |
| `MONGOMS_DISABLE_POSTINSTALL` | `1` (skips the 120 MB test MongoDB download) |

Client-side routes need no config: with no `404.html` in the build, Pages
serves `index.html` for any path it doesn't find.

## 2. Add the custom domain

In the Pages project, open **Custom domains → Set up a custom domain** and
enter the web subdomain, e.g. `quarry.example.com`. Cloudflare shows a CNAME
target (`<project>.pages.dev`). Add that CNAME at your DNS provider. A
subdomain works without moving the domain's nameservers to Cloudflare.

## 3. Point the API at the same domain

On Render, add a custom domain for the API, e.g. `api.quarry.example.com`, and
add the CNAME Render shows at your DNS provider. Then set on Render:

- `FRONTEND_URL` to the web origin, e.g. `https://quarry.example.com`. CORS
  and Better Auth only accept requests from it.
- `BETTER_AUTH_URL` to the API origin, e.g. `https://api.quarry.example.com`.

## Why one domain

Better Auth's session cookie is `SameSite=Lax`, so the browser only sends it
when the web app and the API are on the same site. `*.pages.dev` and
`*.onrender.com` are different sites, so sign-in will not stick between them.
