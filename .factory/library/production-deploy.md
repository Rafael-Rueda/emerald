# Production Deploy

Operator runbook for self-hosting Emerald on a VPS (Hetzner, DigitalOcean, Linode, AWS EC2) or in Coolify. For user-facing instructions, see the main [README](../../README.md#self-host-in-production).

**What belongs here:** deploy / update / rollback / backup / restore procedures, troubleshooting, Coolify specifics.
**What does NOT belong here:** env var reference (use `.factory/library/environment.md`), schema/architecture claims (use `.factory/library/architecture.md`).

---

## Purpose

Stand up a production instance of Emerald (API + docs + workspace + Postgres with pgvector) on a single VPS with Docker, or map the same stack onto a managed platform like Coolify. One command bootstraps the stack; updates, rollbacks, and backups are single-command too.

## Architecture

```
                 ┌────────────────────────────────────────────┐
                 │             emerald_net (bridge)           │
                 │                                            │
   :80 / :443 ──►│  caddy (profile: with-proxy, optional)     │
                 │    │                                       │
                 │    ├──► api:3333   (NestJS + MCP)          │
                 │    ├──► docs:3100  (Next.js SSR/ISR)       │
                 │    └──► workspace:3101 (Next.js)           │
                 │              │                             │
                 │              ▼                             │
                 │        postgres:5432                       │
                 │        (pgvector/pgvector:pg17)            │
                 │              ▲                             │
                 │              │                             │
                 │     migrate (init, exits 0)                │
                 │     — runs `prisma migrate deploy`         │
                 │     — api.depends_on(condition: completed) │
                 └────────────────────────────────────────────┘

   Subdomains (driven by $DOMAIN):
     docs.$DOMAIN  → docs
     app.$DOMAIN   → workspace
     api.$DOMAIN   → api
```

When the `with-proxy` profile is active, Caddy terminates TLS via Let's Encrypt and fans out to the three app services. When it's inactive, an external proxy (Coolify, Cloudflare Tunnel, nginx) is expected to handle TLS and routing.

## Setup flow

```bash
git clone https://github.com/Rafael-Rueda/emerald.git
cd emerald
./scripts/setup-production.sh
```

What `setup-production.sh` does, in order:

1. Checks prerequisites: `docker`, `docker compose`, `openssl`.
2. Generates an RS256 JWT keypair into `secrets/jwt-private.pem` and `secrets/jwt-public.pem` (`chmod 600`).
3. Generates a strong random Postgres password.
4. Prompts interactively for:
   - `DOMAIN` (apex; subdomains `docs`, `app`, `api` are derived)
   - Google OAuth client ID / secret / callback URL
   - GCP bucket name and path to the service account JSON (expected under `secrets/`)
   - `EMBEDDING_PROVIDER` + provider-specific keys (Voyage / OpenAI / Google Vertex / Ollama)
   - `EMBEDDING_DIMENSION` (validated against the chosen model)
5. Writes `.env.production` at the repo root from `.env.production.example`.
6. Builds images: `docker compose -f docker-compose.production.yml build`.
7. Brings the stack up and waits for healthchecks to pass on `api`, `docs`, and `workspace`.

After the script exits, the stack is live. Point DNS for `docs.$DOMAIN`, `app.$DOMAIN`, `api.$DOMAIN` at the server. If using the `with-proxy` profile, Caddy provisions TLS automatically on first request.

## Update flow

```bash
cd /opt/emerald
git pull
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

The `migrate` init container runs `prisma migrate deploy` before `api` starts. If a migration fails, `api` stays on the previous image (it depends on `migrate` completing successfully) — inspect logs with `docker compose logs migrate`.

For zero-downtime updates of a single service, prefer rolling one at a time:

```bash
docker compose -f docker-compose.production.yml up -d --no-deps --build docs
```

## Rollback flow

```bash
# 1. Take a fresh backup (you'll need it if the forward migration was destructive)
./scripts/backup-db.sh

# 2. Check out the previous release tag
git fetch --tags
git checkout v1.4.0   # whatever tag you're rolling back to

# 3. Rebuild and restart
docker compose -f docker-compose.production.yml up -d --build
```

If the release you are rolling back from applied a destructive migration (column drop, type change, HNSW rebuild against a new dimension), restore the database from the pre-upgrade backup **before** starting the older images:

```bash
./scripts/restore-db.sh ./backups/emerald-<pre-upgrade-timestamp>.sql.gz
docker compose -f docker-compose.production.yml up -d --build
```

## Backup / restore flow

### Manual backup

```bash
./scripts/backup-db.sh
# → ./backups/emerald-2026-04-14T03-00-00Z.sql.gz
```

The script runs `pg_dump` inside the `postgres` container and gzips the output to a timestamped file under `./backups/`. No application downtime.

### Scheduled backup (cron)

```cron
# /etc/crontab — daily at 03:00 server time
0 3 * * * root cd /opt/emerald && ./scripts/backup-db.sh >> /var/log/emerald-backup.log 2>&1
```

Ship dumps off-box (rclone to S3/GCS, Restic, borg, etc.) — local-only backups don't survive disk failure.

### Restore

```bash
./scripts/restore-db.sh ./backups/emerald-2026-04-14T03-00-00Z.sql.gz
```

> **Warning — destructive.** This drops and recreates the `emerald` database before loading the dump. The API reconnects automatically once Postgres is healthy again; if it doesn't, `docker compose restart api`.

After restoring, if the backup was taken with a different `EMBEDDING_DIMENSION` or `EMBEDDING_PROVIDER`, run `pnpm --filter @emerald/api ai:dimension:apply` and `pnpm --filter @emerald/api ai:reindex` from inside the `api` container (or temporarily on the host with the production `.env`).

## Coolify specifics

Coolify deployments use the same images but skip the `caddy` service — Coolify owns TLS and routing.

- **Database**: provision a managed Postgres in Coolify using the `pgvector/pgvector:pg17` image. Copy the connection string into `DATABASE_URL`.
- **One Application per service**: three Coolify Applications (`api`, `docs`, `workspace`), each pointing at the same repo with its own Dockerfile (`apps/<service>/Dockerfile`).
- **Env var mapping**: copy the variables documented in [`environment.md`](./environment.md#production-environment-variables--envproduction) into each Application's env settings. `DATABASE_URL`, JWT key paths, GCP credentials, and `EMBEDDING_*` go on all three.
- **Shared secrets**: Coolify's "team secrets" feature works well for values shared across the three apps (JWT keys, DB URL, GCP bucket). Mount JWT keys as files via Coolify's file-mount support.
- **Build args**: `PUBLIC_API_URL`, `PUBLIC_DOCS_URL`, `PUBLIC_WORKSPACE_URL` are consumed at build time by the Next.js apps. Set them as build-time env vars in the Coolify Application config, not just runtime.
- **Migrations**: either run `pnpm --filter @emerald/api prisma migrate deploy` as a pre-deploy command on the `api` Application, or deploy the full compose file once to let the `migrate` init container do it.

## Troubleshooting

| Symptom | Diagnose | Fix |
|---|---|---|
| `docker compose up` exits immediately for a service | `docker compose -f docker-compose.production.yml logs <service>` | Usually env validation (`superRefine`) rejected the config — see the Zod error in the first log line. Fix `.env.production` and retry. |
| `api` container stays in "starting" forever | `docker compose ps` + `docker compose logs api` | Healthcheck is hitting `GET /api/health`. Check `curl http://localhost:3333/api/health` from inside the container; confirm `DATABASE_URL` resolves to the `postgres` service. |
| Embedding calls return 401 / 403 | `docker compose logs api \| grep embedding` | Provider API key is wrong or missing. Verify the active `EMBEDDING_PROVIDER` matches the keys in `.env.production`. |
| Semantic search returns empty / wrong results | Check boot logs for the dimension-mismatch WARN | Run `pnpm --filter @emerald/api ai:dimension:apply` then `pnpm --filter @emerald/api ai:reindex`. |
| `migrate` container exits with non-zero | `docker compose logs migrate` | Prisma prints the failing migration and SQL. Common cause: schema drift between the checked-out tag and the live DB. Restore a pre-upgrade backup before rolling forward again. |
| `caddy` can't issue a certificate | `docker compose logs caddy` | DNS for `docs.$DOMAIN` / `app.$DOMAIN` / `api.$DOMAIN` must resolve to the server, and ports 80/443 must be reachable from the public internet. Cloudflare proxy must be in "DNS only" mode (grey cloud) during first issuance. |
| Workspace loads but API calls fail with CORS errors | Browser devtools network tab | `CORS_ALLOWED_ORIGINS` in `.env.production` must include both `https://docs.$DOMAIN` and `https://app.$DOMAIN`. Restart `api` after changing it. |
| Out-of-disk after a few weeks | `docker system df` | Prune unused images and old backups: `docker image prune -af` and rotate `./backups/` via cron (`find ./backups -mtime +30 -delete`). |

## Related

- [Main README — Self-host in Production](../../README.md#self-host-in-production)
- [environment.md — Production Environment Variables](./environment.md#production-environment-variables--envproduction)
- [architecture.md — Semantic Search / AI Context](./architecture.md#semantic-search--ai-context-architecture-added-semantic-search-mission)
- [apps/api/src/infra/ai/providers/README.md — Adding a new embedding provider](../../apps/api/src/infra/ai/providers/README.md)
