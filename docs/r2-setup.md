# Cloudflare R2 setup

Resume files live in Cloudflare R2, reached through its S3-compatible API.
There are two buckets: one for production, and one shared by staging and
local development. Check R2's current free-tier limits before you start (10 GB
of storage and no egress fees at the time of writing). R2 needs a card on file
even on the free tier.

## 1. Create the buckets

In the Cloudflare dashboard, go to **R2 Object Storage → Create bucket** and
create:

- `quarry-staging` for staging and local development
- `quarry-production` for production

Leave both private: no public access and no custom domain. The server is the
only thing that reads or writes them.

## 2. Add the lifecycle rule

Uploads land under `pending/` and are copied out when onboarding is submitted,
so anything left there is abandoned. On each bucket, open **Settings → Object
lifecycle rules → Add rule** and add:

- Name: `Cleanup pending objects`
- Prefix: `pending/`
- Action: delete objects 1 day after upload

## 3. Create a token per bucket

Go to **R2 Object Storage → Manage API tokens → Create API token** and create
one token per bucket:

- Permissions: **Object Read & Write**
- Specify bucket: only the one bucket the token is for
- TTL: forever, or rotate on your own schedule

Note the **Access Key ID** and **Secret Access Key** it shows once, and the
**Account ID** from the R2 overview page.

## 4. Set the environment variables

| Variable | Value |
| --- | --- |
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | The bucket token's access key ID |
| `R2_SECRET_ACCESS_KEY` | The bucket token's secret access key |
| `R2_BUCKET_NAME` | `quarry-staging` or `quarry-production` |

Locally, put the staging values in `apps/server/.env`. For Claude cloud
sessions, add the staging values to the Quarry cloud environment's variables;
`scripts/claude-cloud-setup.sh` writes them to the server's `.env`, with empty
placeholders for any that are missing. Production gets its own bucket's token.

Tests never reach R2: the integration tests run the real R2 client against an
MSW fake of R2's S3 API (`apps/server/test/integration/fake-r2.ts`).
