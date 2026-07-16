package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/services"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

func registerBody(org string) string {
	payload := map[string]any{
		"org":          org,
		"uuid":         "uuid-1",
		"model":        "Pixel 8",
		"manufacturer": "Google",
		"version":      "1.0.0",
		"device_id":    "device-1",
		"framework":    "expo",
	}
	b, _ := json.Marshal(payload)
	return string(b)
}

func TestRegisterRejectsUnknownProtectedPrefix(t *testing.T) {
	withTestConfig(t, false, func() {
		initAbuseTestStorage(t)
		r := New()
		req := httptest.NewRequest(http.MethodPost, "/api/register", strings.NewReader(registerBody("_transistor_evil")))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		// A reserved-prefix org that no admin has created is rejected with a
		// distinct 404 so the client can prompt for admin provisioning.
		if resp.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for unknown reserved prefix, got %d (%s)", resp.Code, resp.Body.String())
		}
		if !strings.Contains(resp.Body.String(), "ADMIN_ACCOUNT_REQUIRED") {
			t.Fatalf("expected ADMIN_ACCOUNT_REQUIRED code, got %s", resp.Body.String())
		}
		if strings.Contains(resp.Body.String(), "accessToken") {
			t.Fatalf("unknown reserved company should not receive a token, got %s", resp.Body.String())
		}
	})
}

func TestRegisterAllowsExistingProtectedCompany(t *testing.T) {
	withTestConfig(t, false, func() {
		initAbuseTestStorage(t)
		db, err := storage.DB()
		if err != nil {
			t.Fatalf("storage db: %v", err)
		}
		now := time.Now().UTC()
		// Simulate an admin having provisioned the reserved company.
		if err := db.Create(&storage.Company{CompanyToken: "_transistor-dave", CreatedAt: &now, UpdatedAt: &now}).Error; err != nil {
			t.Fatalf("seed reserved company: %v", err)
		}

		r := New()
		req := httptest.NewRequest(http.MethodPost, "/api/register", strings.NewReader(registerBody("_transistor-dave")))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		if resp.Code != http.StatusOK {
			t.Fatalf("expected 200 for existing reserved company, got %d (%s)", resp.Code, resp.Body.String())
		}
		if !strings.Contains(resp.Body.String(), "accessToken") {
			t.Fatalf("expected a token for existing reserved company, got %s", resp.Body.String())
		}
	})
}

func TestRegisterBannedCompanyReturnsStop(t *testing.T) {
	withTestConfig(t, false, func() {
		initAbuseTestStorage(t)
		db, err := storage.DB()
		if err != nil {
			t.Fatalf("storage db: %v", err)
		}
		now := time.Now().UTC()
		if err := db.Create(&storage.Company{CompanyToken: "banned-co", Banned: true, CreatedAt: &now, UpdatedAt: &now}).Error; err != nil {
			t.Fatalf("seed banned company: %v", err)
		}

		r := New()
		req := httptest.NewRequest(http.MethodPost, "/api/register", strings.NewReader(registerBody("banned-co")))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)

		// The banned response is the centralized stop payload, not a registration token.
		if strings.Contains(resp.Body.String(), "accessToken") {
			t.Fatalf("banned company should not receive a token, got %s", resp.Body.String())
		}
		if !strings.Contains(resp.Body.String(), "background_geolocation") {
			t.Fatalf("expected stop payload for banned company, got %s", resp.Body.String())
		}
	})
}

func siteJWTBody(org string) string {
	b, _ := json.Marshal(map[string]any{"org": org})
	return string(b)
}

func TestSiteJWTRejectsUnknownProtectedCompany(t *testing.T) {
	withTestConfig(t, false, func() {
		initAbuseTestStorage(t)
		r := New()
		req := httptest.NewRequest(http.MethodPost, "/api/site/jwt", strings.NewReader(siteJWTBody("_transistor-ghost")))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		// The dashboard token path must not auto-provision reserved orgs, or it
		// would defeat the /api/register reserved-prefix guard.
		if resp.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for unknown reserved org, got %d (%s)", resp.Code, resp.Body.String())
		}
		if strings.Contains(resp.Body.String(), "access_token") {
			t.Fatalf("unknown reserved org should not receive a dashboard token, got %s", resp.Body.String())
		}
		// The reserved company must not have been created as a side effect.
		exists, err := services.CompanyExists("_transistor-ghost")
		if err != nil {
			t.Fatalf("company exists check: %v", err)
		}
		if exists {
			t.Fatalf("dashboard token path should not have created reserved company")
		}
	})
}

func TestSiteJWTAllowsExistingProtectedCompany(t *testing.T) {
	withTestConfig(t, false, func() {
		initAbuseTestStorage(t)
		db, err := storage.DB()
		if err != nil {
			t.Fatalf("storage db: %v", err)
		}
		now := time.Now().UTC()
		if err := db.Create(&storage.Company{CompanyToken: "_transistor-dave", CreatedAt: &now, UpdatedAt: &now}).Error; err != nil {
			t.Fatalf("seed reserved company: %v", err)
		}

		r := New()
		req := httptest.NewRequest(http.MethodPost, "/api/site/jwt", strings.NewReader(siteJWTBody("_transistor-dave")))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Fatalf("expected 200 for existing reserved org, got %d (%s)", resp.Code, resp.Body.String())
		}
		if !strings.Contains(resp.Body.String(), "access_token") {
			t.Fatalf("expected a dashboard token for existing reserved org, got %s", resp.Body.String())
		}
	})
}

func initAbuseTestStorage(t *testing.T) {
	t.Helper()
	storage.ResetForTests()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	dbPath := filepath.Join(t.TempDir(), "abuse-router.db")
	if _, err := storage.Init(ctx, config.DatabaseConfig{SQLitePath: dbPath, AutoMigrate: true}); err != nil {
		t.Fatalf("init storage: %v", err)
	}
	db, err := storage.DB()
	if err != nil {
		t.Fatalf("storage db: %v", err)
	}
	for _, table := range []string{"locations", "devices", "companies"} {
		if err := db.Exec("DELETE FROM " + table).Error; err != nil {
			t.Fatalf("clear %s: %v", table, err)
		}
	}
}
