//go:build admin || heroku || heroku_admin

package api

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/services"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

func TestAdminDashboardActivityAndCompanyBanDelete(t *testing.T) {
	withTestConfig(t, true, func() {
		dbPath := filepath.Join(t.TempDir(), "abuse-admin.db")
		initAdminTestStorage(t, dbPath)
		seedAdminTestData(t)

		r := New()
		sessionCookie, csrfCookie := adminLoginCookies(t, r)

		// The /admin dashboard embeds the activity workspace.
		homeReq := httptest.NewRequest(http.MethodGet, "/admin", nil)
		homeReq.AddCookie(sessionCookie)
		homeReq.AddCookie(csrfCookie)
		homeResp := httptest.NewRecorder()
		r.ServeHTTP(homeResp, homeReq)
		if homeResp.Code != http.StatusOK {
			t.Fatalf("expected /admin 200, got %d", homeResp.Code)
		}
		if !strings.Contains(homeResp.Body.String(), "activity-shell") || !strings.Contains(homeResp.Body.String(), "acme") {
			t.Fatalf("expected activity workspace with seeded org, got %q", homeResp.Body.String())
		}

		// Company ban via JSON API requires the CSRF token.
		banForm := url.Values{}
		banForm.Set("org", "acme")
		banNoCSRF := httptest.NewRequest(http.MethodPost, "/admin/api/companies/ban", strings.NewReader(banForm.Encode()))
		banNoCSRF.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		banNoCSRF.AddCookie(sessionCookie)
		banNoCSRF.AddCookie(csrfCookie)
		banNoCSRFResp := httptest.NewRecorder()
		r.ServeHTTP(banNoCSRFResp, banNoCSRF)
		if banNoCSRFResp.Code != http.StatusForbidden {
			t.Fatalf("expected ban without csrf to be forbidden, got %d", banNoCSRFResp.Code)
		}

		banReq := httptest.NewRequest(http.MethodPost, "/admin/api/companies/ban", strings.NewReader(banForm.Encode()))
		banReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		banReq.Header.Set("X-CSRF-Token", csrfCookie.Value)
		banReq.AddCookie(sessionCookie)
		banReq.AddCookie(csrfCookie)
		banResp := httptest.NewRecorder()
		r.ServeHTTP(banResp, banReq)
		if banResp.Code != http.StatusOK {
			t.Fatalf("expected ban 200, got %d (%s)", banResp.Code, banResp.Body.String())
		}
		if banned, _ := services.CompanyBanned("acme"); !banned {
			t.Fatalf("expected acme to be banned")
		}

		// Delete company and data via JSON API.
		delForm := url.Values{}
		delForm.Set("org", "acme")
		delReq := httptest.NewRequest(http.MethodPost, "/admin/api/companies/delete", strings.NewReader(delForm.Encode()))
		delReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		delReq.Header.Set("X-CSRF-Token", csrfCookie.Value)
		delReq.AddCookie(sessionCookie)
		delReq.AddCookie(csrfCookie)
		delResp := httptest.NewRecorder()
		r.ServeHTTP(delResp, delReq)
		if delResp.Code != http.StatusOK {
			t.Fatalf("expected delete 200, got %d (%s)", delResp.Code, delResp.Body.String())
		}
		db, _ := storage.DB()
		var companies, devices, locations int64
		db.Model(&storage.Company{}).Count(&companies)
		db.Model(&storage.Device{}).Count(&devices)
		db.Model(&storage.Location{}).Count(&locations)
		if companies != 0 || devices != 0 || locations != 0 {
			t.Fatalf("expected company and data deleted, got companies=%d devices=%d locations=%d", companies, devices, locations)
		}
	})
}

func TestAdminActivityPartialsAndJSONActions(t *testing.T) {
	withTestConfig(t, true, func() {
		dbPath := filepath.Join(t.TempDir(), "abuse-partials.db")
		initAdminTestStorage(t, dbPath)
		seedAdminTestData(t) // company "acme" id=1, device id=1, 1 location

		r := New()
		sessionCookie, csrfCookie := adminLoginCookies(t, r)

		// List partial renders with the seeded company.
		listReq := httptest.NewRequest(http.MethodGet, "/admin/partials/activity?sort=locations&dir=desc&page=1", nil)
		listReq.AddCookie(sessionCookie)
		listReq.AddCookie(csrfCookie)
		listResp := httptest.NewRecorder()
		r.ServeHTTP(listResp, listReq)
		if listResp.Code != http.StatusOK {
			t.Fatalf("expected activity list 200, got %d", listResp.Code)
		}
		if !strings.Contains(listResp.Body.String(), "activity-list") || !strings.Contains(listResp.Body.String(), "acme") {
			t.Fatalf("expected list partial with seeded company, got %q", listResp.Body.String())
		}

		// Detail partial renders the company's devices.
		detailReq := httptest.NewRequest(http.MethodGet, "/admin/partials/activity/detail?org=acme&window_hours=24", nil)
		detailReq.AddCookie(sessionCookie)
		detailReq.AddCookie(csrfCookie)
		detailResp := httptest.NewRecorder()
		r.ServeHTTP(detailResp, detailReq)
		if detailResp.Code != http.StatusOK {
			t.Fatalf("expected activity detail 200, got %d", detailResp.Code)
		}
		if !strings.Contains(detailResp.Body.String(), "Devices") || !strings.Contains(detailResp.Body.String(), "device-1") {
			t.Fatalf("expected detail partial with device, got %q", detailResp.Body.String())
		}

		// Device delete via JSON API requires the CSRF header.
		delReq := httptest.NewRequest(http.MethodPost, "/admin/api/devices/1/delete", nil)
		delReq.Header.Set("X-CSRF-Token", csrfCookie.Value)
		delReq.AddCookie(sessionCookie)
		delReq.AddCookie(csrfCookie)
		delResp := httptest.NewRecorder()
		r.ServeHTTP(delResp, delReq)
		if delResp.Code != http.StatusOK {
			t.Fatalf("expected device delete 200, got %d (%s)", delResp.Code, delResp.Body.String())
		}
		db, _ := storage.DB()
		var deviceCount int64
		db.Model(&storage.Device{}).Where("id = ?", 1).Count(&deviceCount)
		if deviceCount != 0 {
			t.Fatalf("expected device 1 deleted, got count=%d", deviceCount)
		}

		// Bulk-ban company via JSON API.
		bulkReq := httptest.NewRequest(http.MethodPost, "/admin/api/companies/bulk-ban", strings.NewReader("orgs=acme"))
		bulkReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		bulkReq.Header.Set("X-CSRF-Token", csrfCookie.Value)
		bulkReq.AddCookie(sessionCookie)
		bulkReq.AddCookie(csrfCookie)
		bulkResp := httptest.NewRecorder()
		r.ServeHTTP(bulkResp, bulkReq)
		if bulkResp.Code != http.StatusOK {
			t.Fatalf("expected bulk ban 200, got %d (%s)", bulkResp.Code, bulkResp.Body.String())
		}
		if banned, _ := services.CompanyBanned("acme"); !banned {
			t.Fatalf("expected acme banned after bulk-ban")
		}
	})
}

func TestMaintenanceEndpointAuth(t *testing.T) {
	withAbuseMaintenanceConfig(t, "secret-token", func() {
		dbPath := filepath.Join(t.TempDir(), "abuse-maint.db")
		initAdminTestStorage(t, dbPath)
		r := New()

		// No auth at all -> 401.
		noAuth := httptest.NewRequest(http.MethodPost, "/admin/api/maintenance/cleanup", nil)
		noAuthResp := httptest.NewRecorder()
		r.ServeHTTP(noAuthResp, noAuth)
		if noAuthResp.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 without auth, got %d", noAuthResp.Code)
		}

		// Wrong shared secret -> 403.
		badTok := httptest.NewRequest(http.MethodPost, "/admin/api/maintenance/cleanup", nil)
		badTok.Header.Set("X-Maintenance-Token", "nope")
		badTokResp := httptest.NewRecorder()
		r.ServeHTTP(badTokResp, badTok)
		if badTokResp.Code != http.StatusForbidden {
			t.Fatalf("expected 403 with wrong token, got %d", badTokResp.Code)
		}

		// Correct shared secret -> 200 (headless cron path).
		goodTok := httptest.NewRequest(http.MethodPost, "/admin/api/maintenance/cleanup", nil)
		goodTok.Header.Set("X-Maintenance-Token", "secret-token")
		goodTokResp := httptest.NewRecorder()
		r.ServeHTTP(goodTokResp, goodTok)
		if goodTokResp.Code != http.StatusOK {
			t.Fatalf("expected 200 with valid maintenance token, got %d (%s)", goodTokResp.Code, goodTokResp.Body.String())
		}

		// Admin session + CSRF path -> 200.
		sessionCookie, csrfCookie := adminLoginCookies(t, r)
		adminReq := httptest.NewRequest(http.MethodPost, "/admin/api/maintenance/check-thresholds", nil)
		adminReq.Header.Set("X-CSRF-Token", csrfCookie.Value)
		adminReq.AddCookie(sessionCookie)
		adminReq.AddCookie(csrfCookie)
		adminResp := httptest.NewRecorder()
		r.ServeHTTP(adminResp, adminReq)
		if adminResp.Code != http.StatusOK {
			t.Fatalf("expected 200 via admin session, got %d (%s)", adminResp.Code, adminResp.Body.String())
		}
	})
}

// withAbuseMaintenanceConfig writes a config with the admin surface enabled and an
// abuse maintenance token, mirroring withTestConfig's auth/admin sections.
func withAbuseMaintenanceConfig(t *testing.T, maintenanceToken string, fn func()) {
	t.Helper()
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "server.toml")
	contents := strings.TrimSpace(`
[server]
port = 9000

[database]
auto_migrate = false

[auth]
admin_username = "admin"
admin_token = "unused"
password = "secret-pass"
jwt_private_key = "test-signing-key"
jwt_public_key = "test-public-key"
encryption_password = "test-encryption-password"

[admin]
surface_enabled = true
login_mode = "password"
bootstrap_username = "admin"
bootstrap_password = "secret-pass"
cookie_name = "bgc_admin"
cookie_secure = false
session_ttl_minutes = 30
session_max_hours = 8

[abuse]
enabled = true
retention_days = 90
maintenance_token = "` + maintenanceToken + `"
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
