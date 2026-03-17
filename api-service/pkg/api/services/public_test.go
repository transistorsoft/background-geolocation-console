package services

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

func TestDeviceDetailsDisplayName(t *testing.T) {
	tests := []struct {
		name   string
		device DeviceDetails
		want   string
	}{
		{
			name: "legacy company device id becomes model username framework",
			device: DeviceDetails{
				DeviceID:    "arm64-dlazar",
				DeviceModel: "arm64",
				Framework:   "flutter",
			},
			want: "arm64-dlazar (flutter)",
		},
		{
			name: "falls back to raw device id when no username pattern",
			device: DeviceDetails{
				DeviceID:    "custom-device",
				DeviceModel: "Pixel 8",
				Framework:   "expo",
			},
			want: "custom-device (expo)",
		},
		{
			name: "uses model when device id missing",
			device: DeviceDetails{
				DeviceModel: "dashboard",
				Framework:   "dashboard",
			},
			want: "dashboard (dashboard)",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.device.DisplayName(); got != tc.want {
				t.Fatalf("DisplayName() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestLatestSessionRangeReturnsNewestContiguousWindow(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "latest-session.db")
	if _, err := storage.Init(context.Background(), config.DatabaseConfig{
		SQLitePath:  dbPath,
		AutoMigrate: true,
	}); err != nil {
		t.Fatalf("init storage: %v", err)
	}

	db, err := storage.DB()
	if err != nil {
		t.Fatalf("get storage db: %v", err)
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

	now := time.Date(2026, time.March, 17, 12, 0, 0, 0, time.UTC)
	company := storage.Company{CompanyToken: "acme"}
	if err := db.Create(&company).Error; err != nil {
		t.Fatalf("create company: %v", err)
	}
	device := storage.Device{
		CompanyID:    &company.ID,
		CompanyToken: "acme",
		DeviceID:     "device-1",
		DeviceModel:  "Pixel",
		Framework:    "expo",
	}
	if err := db.Create(&device).Error; err != nil {
		t.Fatalf("create device: %v", err)
	}

	recordedTimes := []time.Time{
		now,
		now.Add(-10 * time.Minute),
		now.Add(-20 * time.Minute),
		now.Add(-70 * time.Minute),
	}
	for i, ts := range recordedTimes {
		payload, err := json.Marshal(map[string]any{
			"uuid":        "session-point",
			"recorded_at": ts.Format(time.RFC3339Nano),
		})
		if err != nil {
			t.Fatalf("marshal payload: %v", err)
		}
		recordedAt := ts
		location := storage.Location{
			CompanyID:  &company.ID,
			DeviceID:   &device.ID,
			RecordedAt: &recordedAt,
			Data:       payload,
			UUID:       "session-point",
		}
		if err := db.Create(&location).Error; err != nil {
			t.Fatalf("create location %d: %v", i, err)
		}
	}

	session, err := LatestSessionRange(LocationFilters{
		Org:      "acme",
		DeviceID: &device.ID,
	}, 30*time.Minute)
	if err != nil {
		t.Fatalf("LatestSessionRange error: %v", err)
	}
	if session == nil {
		t.Fatalf("expected session range")
	}
	if session.Count != 3 {
		t.Fatalf("expected 3 points in latest session, got %d", session.Count)
	}
	if session.Start == nil || !session.Start.Equal(now.Add(-20*time.Minute)) {
		t.Fatalf("expected start %s, got %v", now.Add(-20*time.Minute).Format(time.RFC3339), session.Start)
	}
	if session.End == nil || !session.End.Equal(now) {
		t.Fatalf("expected end %s, got %v", now.Format(time.RFC3339), session.End)
	}
}
