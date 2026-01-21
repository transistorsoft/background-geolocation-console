# Background Geolocation Console

## 2026 Go Rewrite

This is an experimental service designed to incorporate the structure and features of the existing background geolocation console but bringing new capabilities to it.

Additional functionality may come from integrated GIS database as well as more control of company and device access. The service can be used both locally and via the web via tracker.transistorsoft.com

## API service entrypoint

This binary boots the real `api-service` (found in `../api-service`) so it can be deployed to Heroku without touching the original sources. Configuration now works like this:

- If `API_SERVICE_CONFIG` points to a readable TOML file, that file is used.
- Otherwise, the app scans the environment and writes a temporary TOML file before booting.

At minimum the following variables must be present when running without a TOML file:

```
DATABASE_URL
ADMIN_USERNAME
ADMIN_PASSWORD
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
ENCRYPTION_PASSWORD
```

Optional overrides include `NODE_ENV`, `BODY_PARSER_LIMIT`, `DATA_LOG`, `AUTO_MIGRATE`, Google/ Firebase keys, and the deny-list fields (comma-separated).

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

Heroku still expects the service to bind to `PORT`; `main.go` now prefers `PORT`, then `ADDR`, and finally any port coming from the synthesized config.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
