package services

import (
	"encoding/json"
	"testing"
	"time"
)

func TestBuildLocationRecord(t *testing.T) {
	recorded := "2025-10-31T12:34:56Z"
	payload := map[string]any{
		"latitude":    12.34,
		"longitude":   -56.78,
		"recorded_at": recorded,
		"uuid":        "test-uuid",
		"extra": map[string]any{
			"foo": "bar",
		},
	}

	loc, err := buildLocationRecord(payload, 42, 7)
	if err != nil {
		t.Fatalf("buildLocationRecord returned error: %v", err)
	}

	if loc.CompanyID == nil || *loc.CompanyID != 42 {
		t.Fatalf("expected company_id 42, got %v", derefInt(loc.CompanyID))
	}
	if loc.DeviceID == nil || *loc.DeviceID != 7 {
		t.Fatalf("expected device_id 7, got %v", derefInt(loc.DeviceID))
	}

	if loc.Latitude == nil || *loc.Latitude != 12.34 {
		t.Fatalf("expected latitude 12.34, got %v", loc.Latitude)
	}
	if loc.Longitude == nil || *loc.Longitude != -56.78 {
		t.Fatalf("expected longitude -56.78, got %v", loc.Longitude)
	}

	if loc.RecordedAt == nil {
		t.Fatalf("expected recorded_at to be set")
	}
	if got := loc.RecordedAt.UTC().Format(time.RFC3339); got != recorded {
		t.Fatalf("expected recorded_at %s, got %s", recorded, got)
	}

	var stored map[string]any
	if err := json.Unmarshal(loc.Data, &stored); err != nil {
		t.Fatalf("unmarshal data: %v", err)
	}
	if stored["uuid"] != "test-uuid" {
		t.Fatalf("expected uuid \"test-uuid\" in stored data, got %v", stored["uuid"])
	}
}

func TestParseNumericTime(t *testing.T) {
	ms := 1730378096000.0 // 2024-10-31T12:34:56Z in milliseconds
	ts := parseNumericTime(ms)
	if ts == nil {
		t.Fatalf("expected timestamp for milliseconds value")
	}
	if got := ts.UTC().Format(time.RFC3339); got != "2024-10-31T12:34:56Z" {
		t.Fatalf("expected RFC3339 2024-10-31T12:34:56Z, got %s", got)
	}

	seconds := 1730378096.0
	ts = parseNumericTime(seconds)
	if ts == nil {
		t.Fatalf("expected timestamp for seconds value")
	}
	if got := ts.UTC().Format(time.RFC3339); got != "2024-10-31T12:34:56Z" {
		t.Fatalf("expected RFC3339 2024-10-31T12:34:56Z, got %s", got)
	}

	if parseNumericTime(123) != nil {
		t.Fatalf("expected nil for invalid epoch value")
	}
}
