package storage

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestEnsureLocationUUIDUnique(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "dedup.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&Company{}, &Device{}, &Location{}); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	now := time.Now().UTC()
	company := Company{CompanyToken: "acme", CreatedAt: &now, UpdatedAt: &now}
	if err := db.Create(&company).Error; err != nil {
		t.Fatalf("create company: %v", err)
	}
	device := Device{CompanyID: &company.ID, CompanyToken: "acme", DeviceID: "d1", CreatedAt: &now, UpdatedAt: &now}
	if err := db.Create(&device).Error; err != nil {
		t.Fatalf("create device: %v", err)
	}
	mk := func(uuid string) *Location {
		return &Location{CompanyID: &company.ID, DeviceID: &device.ID, RecordedAt: &now, UUID: uuid, Data: datatypes.JSON([]byte("{}"))}
	}

	// Seed pre-existing duplicates (3x "U1"), two empty-uuid rows, and one "U2".
	for i := 0; i < 3; i++ {
		if err := db.Create(mk("U1")).Error; err != nil {
			t.Fatalf("seed U1: %v", err)
		}
	}
	if err := db.Create(mk("")).Error; err != nil {
		t.Fatalf("seed empty1: %v", err)
	}
	if err := db.Create(mk("")).Error; err != nil {
		t.Fatalf("seed empty2: %v", err)
	}
	if err := db.Create(mk("U2")).Error; err != nil {
		t.Fatalf("seed U2: %v", err)
	}

	if err := ensureLocationUUIDUnique(context.Background(), db, false); err != nil {
		t.Fatalf("ensureLocationUUIDUnique: %v", err)
	}

	var u1, empty, total int64
	db.Model(&Location{}).Where("uuid = ?", "U1").Count(&u1)
	db.Model(&Location{}).Where("uuid = ?", "").Count(&empty)
	db.Model(&Location{}).Count(&total)
	if u1 != 1 {
		t.Fatalf("expected U1 deduped to 1 row, got %d", u1)
	}
	if empty != 2 {
		t.Fatalf("expected 2 empty-uuid rows preserved, got %d", empty)
	}
	if total != 4 { // 1 U1 + 2 empty + 1 U2
		t.Fatalf("expected 4 rows after dedup, got %d", total)
	}

	// The unique index now rejects a duplicate non-empty uuid...
	if err := db.Create(mk("U1")).Error; err == nil {
		t.Fatalf("expected unique violation inserting duplicate U1")
	}
	// ...but still allows additional empty-uuid rows.
	if err := db.Create(mk("")).Error; err != nil {
		t.Fatalf("empty-uuid insert should be allowed, got: %v", err)
	}

	// Re-running is a no-op (guarded by index existence).
	if err := ensureLocationUUIDUnique(context.Background(), db, false); err != nil {
		t.Fatalf("re-run ensureLocationUUIDUnique: %v", err)
	}
}
