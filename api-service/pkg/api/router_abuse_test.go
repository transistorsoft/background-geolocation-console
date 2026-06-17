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

func TestRegisterRejectsProtectedPrefix(t *testing.T) {
	withTestConfig(t, false, func() {
		initAbuseTestStorage(t)
		r := New()
		req := httptest.NewRequest(http.MethodPost, "/api/register", strings.NewReader(registerBody("_transistor_evil")))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for reserved prefix, got %d (%s)", resp.Code, resp.Body.String())
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
