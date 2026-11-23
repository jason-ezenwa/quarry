# quarry

A pnpm + Turborepo monorepo:

| Workspace | What it is |
| --- | --- |
| `apps/server` | NestJS API on MongoDB (Mongoose), with Better Auth for email and password sign-in |
| `apps/web` | React 19 + Vite single-page app, styled with Tailwind v4 and shadcn components |
| `packages/contracts` | Types, constants and schemas shared by the web app and the server (`@quarry/contracts`) |
| `packages/lint-rules` | Custom lint rules both apps load through oxlint |

## Running locally

1. Start a MongoDB replica set (Better Auth writes inside transactions, which
   need one).
2. Copy `apps/server/.env.example` to `apps/server/.env` and
   `apps/web/.env.example` to `apps/web/.env`. Resume uploads need the R2
   variables; see [docs/r2-setup.md](docs/r2-setup.md).
3. `pnpm install`, then `pnpm --filter server migrate:up` and
   `pnpm --filter server seed`.
4. `pnpm dev` applies any pending migrations, then starts the API on
   `http://localhost:3000` and the web app on `http://localhost:5173`.

In a Claude cloud session, `pnpm dev:claude:cloud` does all of this for you.
See [AGENTS.md](AGENTS.md).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Pending migrations, then server and web app in watch mode |
| `pnpm build` | Build every workspace |
| `pnpm lint` | oxlint in every workspace |
| `pnpm test` | Unit tests in every workspace |
| `pnpm test:integration` | Integration tests in every workspace |

Each also runs per app, for example `pnpm --filter server test:integration`.

## Testing

Unit and integration tests run separately with Vitest, so `test` stays fast
and never needs a database.

Integration tests live in an `__integration__/` folder inside the module they
cover, next to that module's fixtures.

| App | File name | Runs against |
| --- | --- | --- |
| `apps/server` | `__integration__/*.integration.spec.ts` | The full Nest app on an in-memory MongoDB replica set, with the real migrations applied |
| `apps/web` | `__integration__/*.integration.test.tsx` | jsdom and the real route tree, with the API mocked by MSW |

The shared harness:

- `apps/server/test/integration/`: `global-setup.mts` starts MongoDB once per
  run and applies the migrations, `setup.ts` empties the database after every
  test (so seed in `beforeEach`), and `createTestApp()` boots the app. Assert
  on stored data with `getTestDatabase()`.
- `apps/web/src/test/integration/`: the MSW server and its baseline handlers.
  Override one for a single test with `server.use(...)`. A request with no
  handler fails the test. `renderRoute(path)` renders the app at a path and
  `signInAs()` serves a session.

`apps/server/src/test-utils/mock-of-type.ts` builds typed partial mocks
(`mockOfType<T>(...)`) in place of `as any`.

## Database indexes

Indexes are created in migrations (`apps/server/migrations`, run with
`migrate-mongo`), never in schema decorators.

## Lint rules

Both apps lint with oxlint. The custom rules in `packages/lint-rules` load
through oxlint's JS plugin support and are addressed as `local/<rule-name>`.
See that package's README for which app runs which rule.

## Design system

The web app's tokens live in `apps/web/src/index.css` and every primitive is
shown on the `/design-system` page of the dev server. See
[apps/web/AGENTS.md](apps/web/AGENTS.md) for how to build UI with them.
