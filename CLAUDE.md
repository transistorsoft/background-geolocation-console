# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build variants (central architectural concept)

The admin surface is gated at **two layers**: compile-time build tags AND runtime config. Changing one without the other has no effect.

**Compile-time (build tags `admin`, `heroku`, or `heroku_admin`):**
- Default `go build .` — public binary; admin code is not compiled in.
- `go build -tags admin .` — admin code compiled in.
- Heroku's Go buildpack automatically sets the `heroku` tag, so Heroku deploys are always admin-capable.

**Runtime (`[admin].surface_enabled` / `ADMIN_SURFACE_ENABLED`):**
- Even with admin compiled in, `/admin` routes are not registered unless this is true.

Admin-gated files come in paired sets guarded by `//go:build admin || heroku || heroku_admin` vs `//go:build !admin && !heroku && !heroku_admin`. When adding admin features, you typically need to extend the enabled variant and provide a stub in the disabled variant. Existing pairs:
- `api-service/pkg/api/register_admin_{enabled,disabled}.go`
- `api-service/pkg/api/admin_status_{enabled,disabled}.go`
- `api-service/pkg/api/config/sample_{admin,public}.go`
- `api-service/cmd/server/initial_config_{admin,public}.go`
- `api-service/pkg/api/handlers/admin.go` + `admin_templates.go` (no disabled stub — these files are entirely absent from public builds)
- `api-service/pkg/api/middleware/admin.go` (same)
- `api-service/pkg/api/router_admin_test.go` (tests only run under admin tags)

## Two entry points, two modules

This repo is a thin wrapper around a vendored `api-service`:

- **Root module** `bg-console-staging` (`./main.go`): the Heroku deployment entry. Uses `internal/configloader` to synthesize a temp TOML file from environment variables, then delegates to `api-service`. Picks the listen address from `PORT` → `ADDR` → config.
- **api-service module** (`./api-service`, wired in via `replace` directive in the root `go.mod`): contains all real logic. Its own `cmd/server/main.go` is the interactive local entry with `--initialize`, `--docker`, and `-f/--config` flags; it prompts to generate a starter `server.toml` when one isn't found.

When running at the repo root, both `go run ./...` and `go build .` use the root entry. To use the interactive CLI, run `go run ./api-service/cmd/server`.

## Common commands

```sh
# Run the Heroku-style entry (env-driven config) — see README for required env vars
go run ./...
go run -tags admin ./...             # admin-capable local run

# Run the interactive CLI entry (TOML-driven)
go run ./api-service/cmd/server
go run ./api-service/cmd/server --initialize          # generate a starter server.local.toml
go run ./api-service/cmd/server -f path/to.toml
go run ./api-service/cmd/server --docker              # bootstraps a dockerized Postgres for local dev

# Build
go build .                           # public
go build -tags admin .               # admin-capable

# Tests (from within ./api-service)
cd api-service && go test ./...
cd api-service && go test -tags admin ./...           # required to exercise router_admin_test.go and any admin code
cd api-service && go test ./pkg/api/services -run TestFindOrCreateDevice
go run ./api-service/tests postgres_smoke             # see api-service/tests/postgres_smoke/main.go

# Seed / JWT self-test helper (separate CLI)
go run ./api-service/tests seed --org demo-company --count 3
go run ./api-service/tests jwt-selftest
```

Tests that touch admin code are compiled out by default; run with `-tags admin` (or `heroku`) to include them. The `withTestConfig` helper in `router_test.go` writes a TOML config, sets `API_SERVICE_CONFIG`, and calls `config.ResetForTests()` around the test — use the same pattern when adding tests that need config.

## Configuration loading flow

Config is read **once** via `sync.Once` in `api-service/pkg/api/config/config.go`. Two resolution paths:

1. **Env-var path** (`internal/configloader`): if all required env vars are present (`DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `ENCRYPTION_PASSWORD`), configloader builds a `config.Config`, marshals it to a temp TOML at `$TMPDIR/heroku-api-service.toml`, sets `API_SERVICE_CONFIG` to that path, and returns. This is how Heroku works.
2. **File path**: otherwise it falls back to `API_SERVICE_CONFIG` or `server.toml`.

Because of the `sync.Once`, in tests you must call `config.ResetForTests()` (and `storage.ResetForTests()` for DB) between scenarios, and set `API_SERVICE_CONFIG` before calling any `config.Load()`.

When `DATABASE_URL` is set but `DB_CONNECTION_URL` isn't, configloader derives an admin-scoped URL by rewriting the path to `/postgres` so `storage.createPostgresDatabase` can auto-create the target database if it doesn't exist (Postgres error code `3D000`).

## Request surface

Routes are wired in `api-service/pkg/api/router.go` plus the admin registration variants:

- `/healthz` — liveness
- `/api/*` — mobile SDK endpoints, JWT-authed via `middleware.CheckAuthRequired` (`/register`, `/refresh_token`, `/devices`, `/locations`)
- `/api/site/*` — JSON for the frontend (`/env`, `/jwt`, authed: `/company_tokens`, `/devices`, `/locations`, `/locations/latest`)
- `/dashboard`, `/dashboard/:org`, `/dashboard/:org/...` — server-rendered Gin HTML templates with HTMX polling for live updates (10s default, see `htmxPoll` in `pkg/web/server.go`)
- `/admin/*` — admin-only (build-tag + runtime gated). Password login, cookie session, CSRF on mutating routes. Registered in `pkg/api/register_admin_enabled.go`
- `/admin/api/*` — admin JSON API with CSRF

The dashboard and admin dashboard share the same template (`pkg/web/templates/dashboard.html`) and rendering logic (`Server.renderDashboard`) — `IsAdmin` and `RouteBase` toggle per-context.

## Data model

Three GORM models in `api-service/pkg/storage/models.go`:
- `Company` (companies): one per `company_token`, created on first device registration
- `Device` (devices): uniquely identified by the tuple `(company_token, device_id, device_model, framework, version)` — same physical device registering with a different framework creates a new row. See `FindOrCreateDevice` in `pkg/api/services/services.go`.
- `Location` (locations): JSON `data` column via `gorm.io/datatypes`, indexed by `(company_id, device_id, recorded_at)`

Storage supports both Postgres (via `DATABASE_URL`) and SQLite (fallback, default path `./data/api-service.db`). Migrations run via GORM `AutoMigrate` plus raw SQL in `pkg/storage/migrations/{postgres,sqlite}.sql` when `[database].auto_migrate` is true.

## Frontend assets

Templates and static assets are embedded via `go:embed` (`pkg/web/server.go` for the dashboard, `pkg/api/handlers/admin_templates.go` for admin). The dashboard uses HTMX for polling partials (`partials/locations.html`, `partials/admin_search_results.html`). No build step — editing `.html`, `.css`, or `.js` under `pkg/web/` requires a rebuild of the Go binary.

## Heroku specifics

`Procfile` runs `bin/bg-console-staging` (the root module binary). Heroku's buildpack auto-applies the `heroku` build tag, which this repo aliases to admin-capable. Whether `/admin` is reachable on a given app is still controlled by `ADMIN_SURFACE_ENABLED`. For a truly admin-free binary you must build *without* the buildpack or on a non-Heroku target.
