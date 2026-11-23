# Quarry Monorepo — Agent Instructions

## Running the stack

**Local development:**
```bash
pnpm dev
```
Starts the NestJS server and the web app natively, against a MongoDB you are already running.

**Claude cloud sessions (`CLAUDE_CLOUD_SESSION=1`):**
```bash
pnpm dev:claude:cloud
```
Runs `scripts/claude-cloud-setup.sh` first (installs MongoDB natively, writes the env files, runs migrations, seeds the database), then starts the server and web app exactly as `pnpm dev` does.

**Why not `pnpm dev`?** Nothing is installed or seeded in a fresh cloud container: there is no MongoDB, no `apps/server/.env` and no data.

Check the `CLAUDE_CLOUD_SESSION` environment variable to determine which command to use. If it is absent, treat the session as local.

## Seeded account

The seed creates one user you can sign in with on the web app:

- Email: `demo@quarry.dev`
- Password: `quarry-demo-password`
