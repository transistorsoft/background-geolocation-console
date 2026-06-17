//go:build admin || heroku || heroku_admin

package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

func TestAdminLoginAndProtectedRoutes(t *testing.T) {
	withTestConfig(t, true, func() {
		dbPath := filepath.Join(t.TempDir(), "admin-login.db")
		initAdminTestStorage(t, dbPath)
		r := New()

		loginPageReq := httptest.NewRequest(http.MethodGet, "/admin/login", nil)
		loginPageResp := httptest.NewRecorder()
		r.ServeHTTP(loginPageResp, loginPageReq)
		if loginPageResp.Code != http.StatusOK {
			t.Fatalf("expected login page 200, got %d", loginPageResp.Code)
		}
		if !strings.Contains(loginPageResp.Body.String(), "Admin Login") {
			t.Fatalf("expected login page content, got %q", loginPageResp.Body.String())
		}

		protectedReq := httptest.NewRequest(http.MethodGet, "/admin", nil)
		protectedResp := httptest.NewRecorder()
		r.ServeHTTP(protectedResp, protectedReq)
		if protectedResp.Code != http.StatusFound {
			t.Fatalf("expected /admin redirect without cookie, got %d", protectedResp.Code)
		}
		if got := protectedResp.Header().Get("Location"); got != "/admin/login" {
			t.Fatalf("expected redirect to /admin/login, got %q", got)
		}

		htmxReq := httptest.NewRequest(http.MethodGet, "/admin/acme/partials/locations", nil)
		htmxReq.Header.Set("HX-Request", "true")
		htmxResp := httptest.NewRecorder()
		r.ServeHTTP(htmxResp, htmxReq)
		if htmxResp.Code != http.StatusUnauthorized {
			t.Fatalf("expected htmx partial 401 without cookie, got %d", htmxResp.Code)
		}
		if got := htmxResp.Header().Get("HX-Redirect"); got != "/admin/login" {
			t.Fatalf("expected HX-Redirect to /admin/login, got %q", got)
		}

		apiReq := httptest.NewRequest(http.MethodGet, "/admin/api/session", nil)
		apiReq.Header.Set("Authorization", "Bearer public-token")
		apiResp := httptest.NewRecorder()
		r.ServeHTTP(apiResp, apiReq)
		if apiResp.Code != http.StatusUnauthorized {
			t.Fatalf("expected admin api 401 without cookie, got %d", apiResp.Code)
		}

		form := url.Values{}
		form.Set("username", "admin")
		form.Set("password", "secret-pass")
		loginNoCSRFReq := httptest.NewRequest(http.MethodPost, "/admin/login", strings.NewReader(form.Encode()))
		loginNoCSRFReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		loginNoCSRFResp := httptest.NewRecorder()
		r.ServeHTTP(loginNoCSRFResp, loginNoCSRFReq)
		if loginNoCSRFResp.Code != http.StatusForbidden {
			t.Fatalf("expected login without csrf token to be forbidden, got %d", loginNoCSRFResp.Code)
		}

		loginCSRFCookie, loginCSRFToken := fetchLoginCSRF(t, r)
		form.Set("csrf_token", loginCSRFToken)
		loginReq := httptest.NewRequest(http.MethodPost, "/admin/login", strings.NewReader(form.Encode()))
		loginReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		loginReq.AddCookie(loginCSRFCookie)
		loginResp := httptest.NewRecorder()
		r.ServeHTTP(loginResp, loginReq)
		if loginResp.Code != http.StatusFound {
			t.Fatalf("expected successful login redirect, got %d", loginResp.Code)
		}
		sessionCookie := findCookieByName(loginResp.Result().Cookies(), "bgc_admin")
		csrfCookie := findCookieByName(loginResp.Result().Cookies(), "bgc_admin_csrf")
		if sessionCookie == nil || csrfCookie == nil {
			t.Fatalf("expected admin session cookie to be set")
		}

		homeReq := httptest.NewRequest(http.MethodGet, "/admin", nil)
		homeReq.AddCookie(sessionCookie)
		homeReq.AddCookie(csrfCookie)
		homeResp := httptest.NewRecorder()
		r.ServeHTTP(homeResp, homeReq)
		if homeResp.Code != http.StatusOK {
			t.Fatalf("expected /admin 200 with cookie, got %d", homeResp.Code)
		}
		// Admins see the search anchor plus the recent-activity master/detail view
		// in the main panel (which replaces the public "select an org" empty state).
		if !strings.Contains(homeResp.Body.String(), "Admin Search") || !strings.Contains(homeResp.Body.String(), "activity-shell") {
			t.Fatalf("expected admin home content, got %q", homeResp.Body.String())
		}

		sessionReq := httptest.NewRequest(http.MethodGet, "/admin/api/session", nil)
		sessionReq.AddCookie(sessionCookie)
		sessionReq.AddCookie(csrfCookie)
		sessionResp := httptest.NewRecorder()
		r.ServeHTTP(sessionResp, sessionReq)
		if sessionResp.Code != http.StatusOK {
			t.Fatalf("expected admin session 200 with cookie, got %d", sessionResp.Code)
		}
		if !strings.Contains(sessionResp.Body.String(), "\"admin\":true") {
			t.Fatalf("expected admin session json, got %q", sessionResp.Body.String())
		}
	})
}

func TestAdminHomeShowsSeededDevicesAndAllowsDelete(t *testing.T) {
	withTestConfig(t, true, func() {
		dbPath := filepath.Join(t.TempDir(), "admin-test.db")
		initAdminTestStorage(t, dbPath)
		seedAdminTestData(t)

		r := New()
		sessionCookie, csrfCookie := adminLoginCookies(t, r)

		homeReq := httptest.NewRequest(http.MethodGet, "/admin?org=acme", nil)
		homeReq.AddCookie(sessionCookie)
		homeReq.AddCookie(csrfCookie)
		homeResp := httptest.NewRecorder()
		r.ServeHTTP(homeResp, homeReq)
		if homeResp.Code != http.StatusOK {
			t.Fatalf("expected /admin 200, got %d", homeResp.Code)
		}
		body := homeResp.Body.String()
		if !strings.Contains(body, "acme") || !strings.Contains(body, "device-1") {
			t.Fatalf("expected admin home to include seeded org and device, got %q", body)
		}

		searchReq := httptest.NewRequest(http.MethodGet, "/admin?company_query=acm", nil)
		searchReq.AddCookie(sessionCookie)
		searchReq.AddCookie(csrfCookie)
		searchResp := httptest.NewRecorder()
		r.ServeHTTP(searchResp, searchReq)
		if searchResp.Code != http.StatusOK {
			t.Fatalf("expected admin search 200, got %d", searchResp.Code)
		}
		if !strings.Contains(searchResp.Body.String(), "Matches") || !strings.Contains(searchResp.Body.String(), "acme") {
			t.Fatalf("expected admin search results in page, got %q", searchResp.Body.String())
		}

		searchPartialReq := httptest.NewRequest(http.MethodGet, "/admin/partials/company-search?company_query=acm", nil)
		searchPartialReq.AddCookie(sessionCookie)
		searchPartialReq.AddCookie(csrfCookie)
		searchPartialResp := httptest.NewRecorder()
		r.ServeHTTP(searchPartialResp, searchPartialReq)
		if searchPartialResp.Code != http.StatusOK {
			t.Fatalf("expected admin search partial 200, got %d", searchPartialResp.Code)
		}
		if !strings.Contains(searchPartialResp.Body.String(), "Matches") || !strings.Contains(searchPartialResp.Body.String(), "acme") {
			t.Fatalf("expected admin search partial results, got %q", searchPartialResp.Body.String())
		}

		latestReq := httptest.NewRequest(http.MethodGet, "/admin/api/locations/latest?org=acme&device_id=1", nil)
		latestReq.AddCookie(sessionCookie)
		latestReq.AddCookie(csrfCookie)
		latestResp := httptest.NewRecorder()
		r.ServeHTTP(latestResp, latestReq)
		if latestResp.Code != http.StatusOK {
			t.Fatalf("expected latest location 200, got %d", latestResp.Code)
		}
		if !strings.Contains(latestResp.Body.String(), "40.71") {
			t.Fatalf("expected latest location payload, got %q", latestResp.Body.String())
		}

		deleteNoCSRForm := url.Values{}
		deleteNoCSRForm.Set("org", "acme")
		deleteNoCSRForm.Set("confirm", "delete")
		deleteNoCSRReq := httptest.NewRequest(http.MethodPost, "/admin/devices/1/delete", strings.NewReader(deleteNoCSRForm.Encode()))
		deleteNoCSRReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		deleteNoCSRReq.AddCookie(sessionCookie)
		deleteNoCSRReq.AddCookie(csrfCookie)
		deleteNoCSRResp := httptest.NewRecorder()
		r.ServeHTTP(deleteNoCSRResp, deleteNoCSRReq)
		if deleteNoCSRResp.Code != http.StatusForbidden {
			t.Fatalf("expected delete without csrf token to be forbidden, got %d", deleteNoCSRResp.Code)
		}

		deleteForm := url.Values{}
		deleteForm.Set("org", "acme")
		deleteForm.Set("confirm", "delete")
		deleteForm.Set("csrf_token", csrfCookie.Value)
		deleteReq := httptest.NewRequest(http.MethodPost, "/admin/devices/1/delete", strings.NewReader(deleteForm.Encode()))
		deleteReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		deleteReq.AddCookie(sessionCookie)
		deleteReq.AddCookie(csrfCookie)
		deleteResp := httptest.NewRecorder()
		r.ServeHTTP(deleteResp, deleteReq)
		if deleteResp.Code != http.StatusFound {
			t.Fatalf("expected delete redirect, got %d", deleteResp.Code)
		}

		db, err := storage.DB()
		if err != nil {
			t.Fatalf("storage db: %v", err)
		}
		var count int64
		if err := db.Model(&storage.Device{}).Where("id = ?", 1).Count(&count).Error; err != nil {
			t.Fatalf("count device: %v", err)
		}
		if count != 0 {
			t.Fatalf("expected device to be deleted, remaining count=%d", count)
		}

		deleteAPIReq := httptest.NewRequest(http.MethodDelete, "/admin/api/devices/1?org=acme", nil)
		deleteAPIReq.AddCookie(sessionCookie)
		deleteAPIReq.AddCookie(csrfCookie)
		deleteAPIResp := httptest.NewRecorder()
		r.ServeHTTP(deleteAPIResp, deleteAPIReq)
		if deleteAPIResp.Code != http.StatusForbidden {
			t.Fatalf("expected api delete without csrf header to be forbidden, got %d", deleteAPIResp.Code)
		}
	})
}

func adminLoginCookies(t *testing.T, r http.Handler) (*http.Cookie, *http.Cookie) {
	t.Helper()
	loginCSRFCookie, loginCSRFToken := fetchLoginCSRF(t, r)
	form := url.Values{}
	form.Set("username", "admin")
	form.Set("password", "secret-pass")
	form.Set("csrf_token", loginCSRFToken)
	loginReq := httptest.NewRequest(http.MethodPost, "/admin/login", strings.NewReader(form.Encode()))
	loginReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	loginReq.AddCookie(loginCSRFCookie)
	loginResp := httptest.NewRecorder()
	r.ServeHTTP(loginResp, loginReq)
	if loginResp.Code != http.StatusFound {
		t.Fatalf("expected successful login redirect, got %d", loginResp.Code)
	}
	sessionCookie := findCookieByName(loginResp.Result().Cookies(), "bgc_admin")
	csrfCookie := findCookieByName(loginResp.Result().Cookies(), "bgc_admin_csrf")
	if sessionCookie == nil || csrfCookie == nil {
		t.Fatalf("expected session cookie")
	}
	return sessionCookie, csrfCookie
}

func fetchLoginCSRF(t *testing.T, r http.Handler) (*http.Cookie, string) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/admin/login", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Fatalf("expected login page 200, got %d", resp.Code)
	}
	csrfCookie := findCookieByName(resp.Result().Cookies(), "bgc_admin_csrf")
	if csrfCookie == nil || csrfCookie.Value == "" {
		t.Fatalf("expected csrf cookie from login page")
	}
	return csrfCookie, csrfCookie.Value
}

func findCookieByName(cookies []*http.Cookie, name string) *http.Cookie {
	for _, cookie := range cookies {
		if cookie.Name == name {
			return cookie
		}
	}
	return nil
}

func initAdminTestStorage(t *testing.T, dbPath string) {
	t.Helper()
	config.ResetForTests()
	storage.ResetForTests()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := storage.Init(ctx, config.DatabaseConfig{SQLitePath: dbPath, AutoMigrate: true}); err != nil {
		t.Fatalf("init storage: %v", err)
	}
	cleanupAdminTables(t)
}

func cleanupAdminTables(t *testing.T) {
	t.Helper()
	db, err := storage.DB()
	if err != nil {
		t.Fatalf("storage db: %v", err)
	}
	if err := db.Exec("DELETE FROM locations").Error; err != nil {
		t.Fatalf("clear locations: %v", err)
	}
	if err := db.Exec("DELETE FROM devices").Error; err != nil {
		t.Fatalf("clear devices: %v", err)
	}
	if err := db.Exec("DELETE FROM companies").Error; err != nil {
		t.Fatalf("clear companies: %v", err)
	}
}

func seedAdminTestData(t *testing.T) {
	t.Helper()
	db, err := storage.DB()
	if err != nil {
		t.Fatalf("storage db: %v", err)
	}
	now := time.Date(2026, time.April, 1, 12, 0, 0, 0, time.UTC)
	company := storage.Company{ID: 1, CompanyToken: "acme", CreatedAt: &now, UpdatedAt: &now}
	if err := db.Create(&company).Error; err != nil {
		t.Fatalf("create company: %v", err)
	}
	device := storage.Device{ID: 1, CompanyID: &company.ID, CompanyToken: "acme", DeviceID: "device-1", DeviceModel: "Pixel", Framework: "expo", CreatedAt: &now, UpdatedAt: &now}
	if err := db.Create(&device).Error; err != nil {
		t.Fatalf("create device: %v", err)
	}
	lat := 40.71
	lng := -74.0
	payload, err := json.Marshal(map[string]any{"latitude": lat, "longitude": lng, "recorded_at": now.Format(time.RFC3339Nano), "uuid": "loc-1"})
	if err != nil {
		t.Fatalf("marshal location payload: %v", err)
	}
	location := storage.Location{CompanyID: &company.ID, DeviceID: &device.ID, Latitude: &lat, Longitude: &lng, RecordedAt: &now, Data: payload, UUID: "loc-1"}
	if err := db.Create(&location).Error; err != nil {
		t.Fatalf("create location: %v", err)
	}
}
