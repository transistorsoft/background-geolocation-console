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

func initServicesTestDB(t *testing.T) {
	t.Helper()
	dbPath := filepath.Join("/tmp", "api-service-services-tests.db")
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
}

func TestLatestSessionRangeReturnsNewestContiguousWindow(t *testing.T) {
	initServicesTestDB(t)

	db, err := storage.DB()
	if err != nil {
		t.Fatalf("get storage db: %v", err)
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

func TestBuildLocationTimelineGroupsDistinctSessions(t *testing.T) {
	initServicesTestDB(t)

	db, err := storage.DB()
	if err != nil {
		t.Fatalf("get storage db: %v", err)
	}

	base := time.Date(2026, time.March, 16, 9, 0, 0, 0, time.UTC)
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
		base,
		base.Add(10 * time.Minute),
		base.Add(24 * time.Hour),
		base.Add(24*time.Hour + 12*time.Minute),
		base.Add(48 * time.Hour),
	}
	for i, ts := range recordedTimes {
		payload, err := json.Marshal(map[string]any{
			"uuid":        "timeline-point",
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
			UUID:       "timeline-point",
		}
		if err := db.Create(&location).Error; err != nil {
			t.Fatalf("create location %d: %v", i, err)
		}
	}

	timeline, err := BuildLocationTimeline(LocationFilters{
		Org:      "acme",
		DeviceID: &device.ID,
	}, 30*time.Minute)
	if err != nil {
		t.Fatalf("BuildLocationTimeline error: %v", err)
	}
	if timeline == nil {
		t.Fatalf("expected timeline")
	}
	if timeline.TotalCount != len(recordedTimes) {
		t.Fatalf("expected total count %d, got %d", len(recordedTimes), timeline.TotalCount)
	}
	if len(timeline.Sessions) != 3 {
		t.Fatalf("expected 3 sessions, got %d", len(timeline.Sessions))
	}
	if timeline.Start == nil || !timeline.Start.Equal(base) {
		t.Fatalf("expected start %s, got %v", base.Format(time.RFC3339), timeline.Start)
	}
	if timeline.End == nil || !timeline.End.Equal(base.Add(48*time.Hour)) {
		t.Fatalf("expected end %s, got %v", base.Add(48*time.Hour).Format(time.RFC3339), timeline.End)
	}
	if got := timeline.Sessions[0].Count; got != 2 {
		t.Fatalf("expected first session count 2, got %d", got)
	}
	if got := timeline.Sessions[1].Count; got != 2 {
		t.Fatalf("expected second session count 2, got %d", got)
	}
	if got := timeline.Sessions[2].Count; got != 1 {
		t.Fatalf("expected third session count 1, got %d", got)
	}
}
