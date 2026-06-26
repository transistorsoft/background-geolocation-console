package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

// seedActivity creates a company with the given number of devices, each posting
// locationsPerDevice points: half inside the 24h window, half well outside it.
func seedActivity(t *testing.T, token string, devices, recentPerDevice, oldPerDevice int) int64 {
	t.Helper()
	db, err := storage.DB()
	if err != nil {
		t.Fatalf("storage db: %v", err)
	}
	now := time.Now().UTC()
	company := storage.Company{CompanyToken: token, CreatedAt: &now, UpdatedAt: &now}
	if err := db.Create(&company).Error; err != nil {
		t.Fatalf("create company %s: %v", token, err)
	}
	for d := 0; d < devices; d++ {
		device := storage.Device{
			CompanyID:    &company.ID,
			CompanyToken: token,
			DeviceID:     token + "-dev",
			DeviceModel:  "Pixel",
			Framework:    "expo",
			Version:      string(rune('a' + d)), // distinct fingerprint per device
			CreatedAt:    &now,
			UpdatedAt:    &now,
		}
		if err := db.Create(&device).Error; err != nil {
			t.Fatalf("create device: %v", err)
		}
		seq := 0
		write := func(ts time.Time, n int) {
			for i := 0; i < n; i++ {
				seq++
				recordedAt := ts
				u := fmt.Sprintf("%s-%d-%d", token, d, seq) // distinct uuid per location
				payload, _ := json.Marshal(map[string]any{"uuid": u, "recorded_at": ts.Format(time.RFC3339Nano)})
				loc := storage.Location{CompanyID: &company.ID, DeviceID: &device.ID, RecordedAt: &recordedAt, Data: payload, UUID: u}
				if err := db.Create(&loc).Error; err != nil {
					t.Fatalf("create location: %v", err)
				}
			}
		}
		write(now.Add(-1*time.Hour), recentPerDevice)
		write(now.Add(-100*24*time.Hour), oldPerDevice)
	}
	return company.ID
}

func TestIsProtectedCompanyToken(t *testing.T) {
	cases := map[string]bool{
		"_transistor":      true,
		"_transistor_demo": true,
		" _TRANSISTOR_x ":  true,
		"transistor":       false,
		"acme":             false,
		"":                 false,
	}
	for token, want := range cases {
		if got := IsProtectedCompanyToken(token); got != want {
			t.Fatalf("IsProtectedCompanyToken(%q) = %v, want %v", token, got, want)
		}
	}
}

func TestBannedStopPayloadShape(t *testing.T) {
	status, body := BannedStopPayload()
	if status != 200 {
		t.Fatalf("expected status 200, got %d", status)
	}
	encoded, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	const want = `{"background_geolocation":[["stop"]]}`
	if string(encoded) != want {
		t.Fatalf("stop payload mismatch:\n got %s\nwant %s", encoded, want)
	}
}

func TestRecentActivityAggregates(t *testing.T) {
	initServicesTestDB(t)
	// busy: 2 devices x 5 recent = 10 recent locations; quiet: 1 device x 2 recent.
	seedActivity(t, "busy", 2, 5, 3)
	seedActivity(t, "quiet", 1, 2, 0)
	seedActivity(t, "idle", 1, 0, 4) // only old data -> 0 recent

	summary, err := RecentActivity(24 * time.Hour)
	if err != nil {
		t.Fatalf("RecentActivity: %v", err)
	}
	counts := map[string]CompanyActivity{}
	for _, c := range summary.Companies {
		counts[c.CompanyToken] = c
	}
	if counts["busy"].LocationCount != 10 {
		t.Fatalf("busy expected 10 recent locations, got %d", counts["busy"].LocationCount)
	}
	if counts["busy"].DeviceCount != 2 {
		t.Fatalf("busy expected 2 active devices, got %d", counts["busy"].DeviceCount)
	}
	if counts["quiet"].LocationCount != 2 {
		t.Fatalf("quiet expected 2 recent locations, got %d", counts["quiet"].LocationCount)
	}
	if counts["idle"].LocationCount != 0 {
		t.Fatalf("idle expected 0 recent locations, got %d", counts["idle"].LocationCount)
	}
	// min/max/avg are computed over active companies (busy=10, quiet=2).
	if summary.ActiveCount != 2 {
		t.Fatalf("expected 2 active companies, got %d", summary.ActiveCount)
	}
	if summary.MaxLocations != 10 || summary.MinLocations != 2 {
		t.Fatalf("expected max=10 min=2, got max=%d min=%d", summary.MaxLocations, summary.MinLocations)
	}
	if summary.AvgLocations != 6 {
		t.Fatalf("expected avg=6, got %v", summary.AvgLocations)
	}
}

func TestRecentActivityPaged(t *testing.T) {
	initServicesTestDB(t)
	seedActivity(t, "busy", 2, 5, 0)  // 10 recent
	seedActivity(t, "quiet", 1, 2, 0) // 2 recent
	seedActivity(t, "idle", 1, 0, 3)  // 0 recent

	// Page 1, 2 per page, sorted by locations desc.
	p1, err := RecentActivityPaged(ActivityQuery{Window: 24 * time.Hour, Sort: "locations", Dir: "desc", Page: 1, PerPage: 2})
	if err != nil {
		t.Fatalf("RecentActivityPaged page1: %v", err)
	}
	if p1.TotalCompanies != 3 {
		t.Fatalf("expected 3 total companies, got %d", p1.TotalCompanies)
	}
	if p1.TotalPages != 2 {
		t.Fatalf("expected 2 pages at 2/page, got %d", p1.TotalPages)
	}
	if len(p1.Companies) != 2 {
		t.Fatalf("expected 2 rows on page 1, got %d", len(p1.Companies))
	}
	if p1.Companies[0].CompanyToken != "busy" || p1.Companies[1].CompanyToken != "quiet" {
		t.Fatalf("unexpected page-1 order: %s, %s", p1.Companies[0].CompanyToken, p1.Companies[1].CompanyToken)
	}
	// Summary computed over active companies only (busy=10, quiet=2).
	if p1.ActiveCount != 2 || p1.MaxLocations != 10 || p1.MinLocations != 2 {
		t.Fatalf("summary mismatch: active=%d max=%d min=%d", p1.ActiveCount, p1.MaxLocations, p1.MinLocations)
	}
	if p1.AvgLocations != 6 {
		t.Fatalf("expected avg 6, got %v", p1.AvgLocations)
	}

	// Page 2 holds the remaining (idle, 0 locations).
	p2, err := RecentActivityPaged(ActivityQuery{Window: 24 * time.Hour, Sort: "locations", Dir: "desc", Page: 2, PerPage: 2})
	if err != nil {
		t.Fatalf("RecentActivityPaged page2: %v", err)
	}
	if len(p2.Companies) != 1 || p2.Companies[0].CompanyToken != "idle" {
		t.Fatalf("expected idle alone on page 2, got %+v", p2.Companies)
	}

	// Ascending token sort puts busy first alphabetically? tokens: busy, idle, quiet.
	asc, err := RecentActivityPaged(ActivityQuery{Window: 24 * time.Hour, Sort: "token", Dir: "asc", Page: 1, PerPage: 25})
	if err != nil {
		t.Fatalf("RecentActivityPaged token asc: %v", err)
	}
	if asc.Companies[0].CompanyToken != "busy" {
		t.Fatalf("expected token-asc first = busy, got %s", asc.Companies[0].CompanyToken)
	}
}

func TestPurgeExpiredLocations(t *testing.T) {
	initServicesTestDB(t)
	seedActivity(t, "busy", 1, 4, 6) // 4 recent + 6 old

	deleted, err := PurgeExpiredLocations(90 * 24 * time.Hour)
	if err != nil {
		t.Fatalf("PurgeExpiredLocations: %v", err)
	}
	if deleted != 6 {
		t.Fatalf("expected 6 old rows purged, got %d", deleted)
	}
	db, _ := storage.DB()
	var remaining int64
	db.Model(&storage.Location{}).Count(&remaining)
	if remaining != 4 {
		t.Fatalf("expected 4 recent rows remaining, got %d", remaining)
	}
}

func TestEvaluateThresholds(t *testing.T) {
	initServicesTestDB(t)
	seedActivity(t, "spammer", 3, 10, 0) // 30 recent locations, 3 devices
	seedActivity(t, "normal", 1, 2, 0)

	violations, err := EvaluateThresholds(config.AbuseConfig{
		WindowHours:           24,
		MaxLocationsPerWindow: 20,
		MaxDevicesPerWindow:   2,
	})
	if err != nil {
		t.Fatalf("EvaluateThresholds: %v", err)
	}
	if len(violations) != 1 {
		t.Fatalf("expected 1 violation, got %d (%+v)", len(violations), violations)
	}
	if violations[0].CompanyToken != "spammer" {
		t.Fatalf("expected spammer flagged, got %s", violations[0].CompanyToken)
	}
}

func TestBanUnbanCompany(t *testing.T) {
	initServicesTestDB(t)
	seedActivity(t, "acme", 1, 1, 0)

	if banned, _ := CompanyBanned("acme"); banned {
		t.Fatalf("company should not be banned initially")
	}
	if err := BanCompany("acme", "abuse"); err != nil {
		t.Fatalf("BanCompany: %v", err)
	}
	if banned, _ := CompanyBanned("acme"); !banned {
		t.Fatalf("company should be banned after BanCompany")
	}
	if err := UnbanCompany("acme"); err != nil {
		t.Fatalf("UnbanCompany: %v", err)
	}
	if banned, _ := CompanyBanned("acme"); banned {
		t.Fatalf("company should be unbanned")
	}

	if err := BanCompany("missing", "x"); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound banning unknown company, got %v", err)
	}
}

func TestDeleteDeviceAndData(t *testing.T) {
	initServicesTestDB(t)
	seedActivity(t, "acme", 2, 3, 1)

	db, _ := storage.DB()
	var device storage.Device
	if err := db.Where("company_token = ?", "acme").First(&device).Error; err != nil {
		t.Fatalf("load device: %v", err)
	}
	if err := DeleteDeviceAndData(device.ID); err != nil {
		t.Fatalf("DeleteDeviceAndData: %v", err)
	}
	var deviceCount, locCount int64
	db.Model(&storage.Device{}).Where("id = ?", device.ID).Count(&deviceCount)
	db.Model(&storage.Location{}).Where("device_id = ?", device.ID).Count(&locCount)
	if deviceCount != 0 || locCount != 0 {
		t.Fatalf("expected device and its locations removed, got device=%d loc=%d", deviceCount, locCount)
	}
	if err := DeleteDeviceAndData(device.ID); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound deleting missing device, got %v", err)
	}
}

func TestDeleteCompanyAndDataCascades(t *testing.T) {
	initServicesTestDB(t)
	seedActivity(t, "acme", 2, 3, 1)

	if err := DeleteCompanyAndData("acme"); err != nil {
		t.Fatalf("DeleteCompanyAndData: %v", err)
	}
	db, _ := storage.DB()
	var companies, devices, locations int64
	db.Model(&storage.Company{}).Count(&companies)
	db.Model(&storage.Device{}).Count(&devices)
	db.Model(&storage.Location{}).Count(&locations)
	if companies != 0 || devices != 0 || locations != 0 {
		t.Fatalf("expected cascade delete to remove all rows, got companies=%d devices=%d locations=%d", companies, devices, locations)
	}
	if err := DeleteCompanyAndData("acme"); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound deleting missing company, got %v", err)
	}
}

func TestListDevicesSortedByLocationCount(t *testing.T) {
	initServicesTestDB(t)
	db, _ := storage.DB()
	now := time.Now().UTC()
	company := storage.Company{CompanyToken: "acme", CreatedAt: &now, UpdatedAt: &now}
	if err := db.Create(&company).Error; err != nil {
		t.Fatalf("create company: %v", err)
	}
	// Three devices with differing location counts; insert in a non-sorted order.
	mk := func(suffix string, count int) {
		dev := storage.Device{CompanyID: &company.ID, CompanyToken: "acme", DeviceID: "dev-" + suffix, DeviceModel: "M", Framework: "f", Version: suffix, CreatedAt: &now, UpdatedAt: &now}
		if err := db.Create(&dev).Error; err != nil {
			t.Fatalf("create device %s: %v", suffix, err)
		}
		for i := 0; i < count; i++ {
			ts := now
			loc := storage.Location{CompanyID: &company.ID, DeviceID: &dev.ID, RecordedAt: &ts, UUID: fmt.Sprintf("%s-%d", suffix, i)}
			if err := db.Create(&loc).Error; err != nil {
				t.Fatalf("create location: %v", err)
			}
		}
	}
	mk("low", 2)
	mk("high", 50)
	mk("mid", 10)

	devices, err := ListDevices("acme", nil, true)
	if err != nil {
		t.Fatalf("ListDevices: %v", err)
	}
	if len(devices) != 3 {
		t.Fatalf("expected 3 devices, got %d", len(devices))
	}
	if devices[0].DeviceID != "dev-high" || devices[1].DeviceID != "dev-mid" || devices[2].DeviceID != "dev-low" {
		t.Fatalf("expected order high,mid,low by location count, got %s,%s,%s", devices[0].DeviceID, devices[1].DeviceID, devices[2].DeviceID)
	}
}

func TestBuildMIME(t *testing.T) {
	msg := string(buildMIME("from@example.com", "to@example.com", "Subject Line", "Body text"))
	for _, want := range []string{"From: from@example.com", "To: to@example.com", "Subject: Subject Line", "Body text"} {
		if !strings.Contains(msg, want) {
			t.Fatalf("expected MIME to contain %q, got:\n%s", want, msg)
		}
	}
}
