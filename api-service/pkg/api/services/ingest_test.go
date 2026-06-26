package services

import (
	"testing"
	"time"

	"github.com/resistorsoftware/api-service/pkg/storage"
)

func TestCreateLocationDeduplicatesUUID(t *testing.T) {
	initServicesTestDB(t)
	db, err := storage.DB()
	if err != nil {
		t.Fatalf("storage db: %v", err)
	}
	now := time.Now().UTC()
	company := storage.Company{CompanyToken: "acme", CreatedAt: &now, UpdatedAt: &now}
	if err := db.Create(&company).Error; err != nil {
		t.Fatalf("create company: %v", err)
	}
	device := storage.Device{CompanyID: &company.ID, CompanyToken: "acme", DeviceID: "d1", CreatedAt: &now, UpdatedAt: &now}
	if err := db.Create(&device).Error; err != nil {
		t.Fatalf("create device: %v", err)
	}
	dev := &Device{ID: device.ID, CompanyID: company.ID, Org: "acme"}

	payload := func(uuid string) map[string]any {
		return map[string]any{
			"latitude":    1.0,
			"longitude":   2.0,
			"recorded_at": now.Format(time.RFC3339Nano),
			"uuid":        uuid,
		}
	}

	// Same uuid posted twice (SDK retry) collapses to one row.
	if err := CreateLocation(payload("A"), "acme", dev); err != nil {
		t.Fatalf("create A #1: %v", err)
	}
	if err := CreateLocation(payload("A"), "acme", dev); err != nil {
		t.Fatalf("create A #2 (retry): %v", err)
	}
	// A distinct uuid is stored.
	if err := CreateLocation(payload("B"), "acme", dev); err != nil {
		t.Fatalf("create B: %v", err)
	}
	// Empty uuids are never deduped (each is a distinct row).
	if err := CreateLocation(payload(""), "acme", dev); err != nil {
		t.Fatalf("create empty #1: %v", err)
	}
	if err := CreateLocation(payload(""), "acme", dev); err != nil {
		t.Fatalf("create empty #2: %v", err)
	}

	var total, aCount, emptyCount int64
	db.Model(&storage.Location{}).Count(&total)
	db.Model(&storage.Location{}).Where("uuid = ?", "A").Count(&aCount)
	db.Model(&storage.Location{}).Where("uuid = ?", "").Count(&emptyCount)
	if aCount != 1 {
		t.Fatalf("expected uuid A stored once, got %d", aCount)
	}
	if emptyCount != 2 {
		t.Fatalf("expected 2 empty-uuid rows, got %d", emptyCount)
	}
	if total != 4 { // A + B + 2 empty
		t.Fatalf("expected 4 rows total, got %d", total)
	}
}
