# Background Geolocation Console

## 2026 Go Rewrite

This is an experimental service designed to incorporate the structure and features of the existing background geolocation console but bringing new capabilities to it.

Additional functionality may come from integrated GIS database as well as more control of company and device access. The service can be used both locally and via the web via tracker.transistorsoft.com

## Minimal Go web service

Local run:

```sh
go run ./...
```

Heroku expects the service to bind to `PORT`. See `Procfile` and `main.go`.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
