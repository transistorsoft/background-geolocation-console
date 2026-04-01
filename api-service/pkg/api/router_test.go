package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/config"
)

func TestAdminRoutesDisabledByDefault(t *testing.T) {
	withTestConfig(t, false, func() {
		r := New()
		req := httptest.NewRequest(http.MethodGet, "/admin/login", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusNotFound {
			t.Fatalf("expected 404 when admin disabled, got %d", resp.Code)
		}
	})
}

func withTestConfig(t *testing.T, adminEnabled bool, fn func()) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "server.toml")
	adminFlag := "false"
	if adminEnabled {
		adminFlag = "true"
	}
	contents := strings.TrimSpace(`
[server]
port = 9000

[database]
database_url = ""
db_connection_url = ""
sqlite_path = ""
auto_migrate = false

[auth]
admin_username = "admin"
admin_token = "unused"
password = "secret-pass"
jwt_private_key = "test-signing-key"
jwt_public_key = "test-public-key"
encryption_password = "test-encryption-password"

[admin]
surface_enabled = `+adminFlag+`
login_mode = "password"
bootstrap_username = "admin"
bootstrap_password = "secret-pass"
cookie_name = "bgc_admin"
cookie_secure = false
session_ttl_minutes = 30
session_max_hours = 8
`) + "\n"
	if err := os.WriteFile(configPath, []byte(contents), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}
	prevPath := os.Getenv("API_SERVICE_CONFIG")
	if err := os.Setenv("API_SERVICE_CONFIG", configPath); err != nil {
		t.Fatalf("set API_SERVICE_CONFIG: %v", err)
	}
	config.ResetForTests()
	defer func() {
		config.ResetForTests()
		if prevPath == "" {
			_ = os.Unsetenv("API_SERVICE_CONFIG")
		} else {
			_ = os.Setenv("API_SERVICE_CONFIG", prevPath)
		}
	}()
	fn()
}
