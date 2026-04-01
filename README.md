# Background Geolocation Console

## 2026 Go Rewrite

This is an experimental service designed to incorporate the structure and features of the existing background geolocation console but bringing new capabilities to it.

Additional functionality may come from integrated GIS database as well as more control of company and device access. The service can be used both locally and via the web via tracker.transistorsoft.com

## Build variants

This project now supports two build variants.

Public build:

```sh
go build .
```

- does not compile the admin surface into the binary
- does not register `/admin` routes under any runtime configuration
- generates sample config without an `[admin]` section

Admin-capable build:

```sh
go build -tags admin .
```

- compiles the admin surface into the binary
- still requires runtime config to enable it
- generates sample config with an `[admin]` section

Runtime enablement for the admin-capable build is controlled by:

```toml
[admin]
surface_enabled = true
```

This means public distributions should be built without the `admin` tag, while internal deployments that need `/admin` should be built with `-tags admin` and then explicitly enabled in config.

Heroku note:

- this repository does not treat the `heroku` tag by itself as admin-capable
- for Cloud Native Buildpacks, build-time Go tags should be set in `project.toml`
- this branch includes a root `project.toml` that sets `GOFLAGS=-tags=admin`
- on Heroku, `/admin` is still controlled at runtime by `ADMIN_SURFACE_ENABLED`

## API service entrypoint

This binary boots the real `api-service` (found in `../api-service`) so it can be deployed to Heroku without touching the original sources. Configuration now works like this:

- If the required environment variables are present, the app synthesizes a temporary TOML file and uses it.
- Otherwise it falls back to a TOML file, using `API_SERVICE_CONFIG` when set or `server.toml` by default.

At minimum the following variables must be present when running without a TOML file:

```
DATABASE_URL
ADMIN_USERNAME
ADMIN_PASSWORD
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
ENCRYPTION_PASSWORD
```

Optional overrides include `NODE_ENV`, `BODY_PARSER_LIMIT`, `DATA_LOG`, `AUTO_MIGRATE`, Google keys, and the deny-list fields (comma-separated).

For admin-capable builds, additional optional env vars include:

```text
ADMIN_SURFACE_ENABLED
ADMIN_LOGIN_MODE
ADMIN_BOOTSTRAP_USERNAME
ADMIN_BOOTSTRAP_PASSWORD
ADMIN_COOKIE_NAME
ADMIN_COOKIE_SECURE
ADMIN_SESSION_TTL_MINUTES
ADMIN_SESSION_MAX_HOURS
```

On public builds these values are ignored because the admin code is not compiled in.

Local run:

```sh
DATABASE_URL=postgres://... \
ADMIN_USERNAME=... \
ADMIN_PASSWORD=... \
JWT_PRIVATE_KEY="$(cat key.pem)" \
JWT_PUBLIC_KEY="$(cat pub.pem)" \
ENCRYPTION_PASSWORD=... \
go run ./...
```

Admin-capable local run:

```sh
DATABASE_URL=postgres://... \
ADMIN_USERNAME=... \
ADMIN_PASSWORD=... \
JWT_PRIVATE_KEY="$(cat key.pem)" \
JWT_PUBLIC_KEY="$(cat pub.pem)" \
ENCRYPTION_PASSWORD=... \
ADMIN_SURFACE_ENABLED=true \
ADMIN_BOOTSTRAP_USERNAME=admin \
ADMIN_BOOTSTRAP_PASSWORD=... \
go run -tags admin ./...
```

Heroku still expects the service to bind to `PORT`; `main.go` now prefers `PORT`, then `ADDR`, and finally any port coming from the synthesized config.

## Heroku Deployment

Heroku does not take Go build tags from `git push`. Instead, configure the target app environment so the Go buildpack builds with the right tags.

Public Heroku app:

- do not set `GOFLAGS`
- deploy normally
- result: public binary with no admin surface compiled in

Admin Heroku app:

```sh
heroku config:set ADMIN_SURFACE_ENABLED=true -a your-admin-app
heroku config:set ADMIN_BOOTSTRAP_USERNAME=admin -a your-admin-app
heroku config:set ADMIN_BOOTSTRAP_PASSWORD='super-secret' -a your-admin-app
```

Then deploy normally:

```sh
git push heroku your-branch:main
```

Recommended setup:

- admin Heroku branch: keep the root `project.toml` with `GOFLAGS=-tags=admin`
- public Heroku branch: omit that `project.toml` build env or change it so no admin tag is used
- admin Heroku app: set `ADMIN_SURFACE_ENABLED=true` plus admin runtime config
- public Heroku app: leave `ADMIN_SURFACE_ENABLED` unset or `false`

This gives you:

- an admin Heroku deployment that compiles the admin surface at build time
- `/admin` only becomes reachable when enabled explicitly by config

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
