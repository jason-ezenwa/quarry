#!/bin/bash
set -e

# Prepares a Claude cloud session to run the full stack natively: installs
# MongoDB, starts it as a single-node replica set on the port MONGODB_URI names,
# writes the server and web env files from the environment, runs the migrations
# and seeds quarry-db.
#
# The guard is a variable we set ourselves in the cloud environment's settings
# rather than one of Claude's own markers (CLAUDE_CODE_REMOTE, IS_SANDBOX): those
# are undocumented, can be renamed, and IS_SANDBOX is also true of a local
# sandbox. Exiting rather than failing when it is unset keeps a stray run on a
# laptop from apt-installing MongoDB over a local setup.
if [ "$CLAUDE_CLOUD_SESSION" != "1" ]; then
  echo "Not a Claude cloud session (CLAUDE_CLOUD_SESSION != 1). Skipping."
  echo "If this IS a Claude cloud session, set CLAUDE_CLOUD_SESSION=1 in the environment config."
  echo "For local development, run pnpm dev instead."
  exit 0
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Installing MongoDB 8.0 and database tools..."
# Guard on -s (non-empty), not -f (exists): pgp.mongodb.com is CloudFront-backed
# and intermittently returns 403/503. When the fetch failed, `gpg -o <final>` had
# already created an empty keyring, so a plain `-f` guard would skip the re-fetch
# on the next run and apt would then fail on the invalid key. Writing to a temp
# file and only installing it on success means a failed attempt never leaves a
# poisoned keyring behind.
if [ ! -s /usr/share/keyrings/mongodb-server-8.0.gpg ]; then
  # Use pgp.mongodb.com directly — the www.mongodb.org URL redirects here but the
  # redirect target occasionally returns 5xx/403. --no-tty --batch avoids gpg
  # trying to open /dev/tty in a non-interactive container. Retry a few times
  # since the CloudFront errors are typically transient.
  for attempt in 1 2 3; do
    if curl -fsSL https://pgp.mongodb.com/server-8.0.asc \
      | sudo gpg --no-tty --batch --yes --dearmor -o /tmp/mongodb-server-8.0.gpg; then
      sudo install -m 0644 /tmp/mongodb-server-8.0.gpg /usr/share/keyrings/mongodb-server-8.0.gpg
      sudo rm -f /tmp/mongodb-server-8.0.gpg
      break
    fi
    echo "MongoDB key fetch attempt ${attempt} failed (transient CloudFront 403/503?); retrying..." >&2
    sudo rm -f /tmp/mongodb-server-8.0.gpg
    sleep $((attempt * 2))
  done
  if [ ! -s /usr/share/keyrings/mongodb-server-8.0.gpg ]; then
    echo "Failed to fetch the MongoDB signing key after 3 attempts." >&2
    exit 1
  fi
fi
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
# Pin the MongoDB 8.0 server line to a specific patch. The unpinned `mongodb-org`
# metapackage resolves to the latest patch, which couples setup to that build
# being fully published on MongoDB's apt CDN — a withdrawn/not-yet-propagated
# .deb returns 403 from CloudFront and breaks the install.
#
# NOTE: `mongodb-org`'s dependencies are UNVERSIONED, so pinning only the
# metapackage still lets apt pull the latest patch for the server/mongos/shell
# components. Each 8.0.x component must be pinned explicitly. `mongodb-mongosh`
# and `mongodb-database-tools` version independently and stay unpinned.
MONGODB_VERSION="8.0.4"
# --allow-releaseinfo-change: the base image ships unrelated third-party PPAs
# whose Release metadata (Label/Suite) drifts over time. With `set -e`, a plain
# `apt-get update` aborts the whole setup when it sees that drift, before MongoDB
# is ever installed. Accepting the metadata change keeps setup resilient to any
# such repo, not just the current culprit.
sudo apt-get update -qq --allow-releaseinfo-change && sudo apt-get install -y \
  "mongodb-org=${MONGODB_VERSION}" \
  "mongodb-org-server=${MONGODB_VERSION}" \
  "mongodb-org-mongos=${MONGODB_VERSION}" \
  "mongodb-org-shell=${MONGODB_VERSION}" \
  "mongodb-org-database=${MONGODB_VERSION}" \
  "mongodb-org-database-tools-extra=${MONGODB_VERSION}" \
  "mongodb-org-tools=${MONGODB_VERSION}" \
  mongodb-mongosh \
  mongodb-database-tools

# The daemon follows MONGODB_URI rather than the other way round: the cloud
# environment already supplies a local URI, so starting mongod on the port it
# names keeps one source of truth — change MONGODB_URI in the environment
# settings and the daemon, the replica set member, the seed and the app all
# move together.
#
# A non-local host is the one case where following the URI would quietly do the
# wrong thing: mongod would come up locally and get seeded while the app talked
# to the remote host. Fail loudly instead of guessing.
if [ -z "${MONGODB_URI:-}" ]; then
  echo "MONGODB_URI is not set in this environment; set it in the cloud environment settings." >&2
  exit 1
fi

MONGO_HOST="$(node -e 'const u = new URL(process.env.MONGODB_URI); process.stdout.write(u.hostname)')"
MONGO_PORT="$(node -e 'const u = new URL(process.env.MONGODB_URI); process.stdout.write(u.port || "27017")')"

case "$MONGO_HOST" in
  127.0.0.1|localhost|::1) ;;
  *)
    echo "MONGODB_URI points at a non-local host (${MONGO_HOST}). Refusing to start and seed a local MongoDB the app will not use." >&2
    exit 1
    ;;
esac

echo "Starting MongoDB as a single-node replica set on port ${MONGO_PORT}..."
sudo mkdir -p /var/lib/mongodb /var/log/mongodb
sudo chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb 2>/dev/null || true
# mongod is launched directly with explicit flags, so the packaged
# /etc/mongod.conf (which pins 27017) is never read.
if ! mongosh --quiet --port "$MONGO_PORT" --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 2)' 2>/dev/null; then
  mongod --replSet rs0 --port "$MONGO_PORT" --bind_ip_all --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork
fi

echo "Waiting for MongoDB to be ready..."
until mongosh --quiet --port "$MONGO_PORT" --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 2)' 2>/dev/null; do
  sleep 1
done

echo "Initiating replica set..."
mongosh --quiet --port "$MONGO_PORT" --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:${MONGO_PORT}'}]})" || true

echo "Waiting for primary election..."
until mongosh --quiet --port "$MONGO_PORT" --eval 'quit(rs.isMaster().ismaster ? 0 : 2)' 2>/dev/null; do
  sleep 1
done

# NestJS reads apps/server/.env, not just process.env, so the server needs the
# environment on disk.
echo "Writing environment variables to apps/server/.env..."
printenv > apps/server/.env

# Placeholders for anything the environment does not set, so the server boots.
# Uploads and parsing need the real values, which tests never do.
for name in R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME APP_ANTHROPIC_API_KEY; do
  if ! grep -q "^${name}=" apps/server/.env; then
    echo "${name}=" >> apps/server/.env
  fi
done

# Vite only exposes VITE_* variables to the browser, and loads .env.local by
# itself, independent of turbo's strict env mode — the same file a local
# checkout has.
echo "Writing environment variables to apps/web/.env.local..."
printenv | grep -E '^VITE_' > apps/web/.env.local || true

echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Migrations first, so the unique indexes exist before the seed writes a user.
echo "Running pending migrations..."
pnpm --filter server migrate:up

echo "Seeding quarry-db..."
pnpm --filter server seed

echo "Cloud setup complete. Run pnpm dev:claude:cloud to start the stack."
