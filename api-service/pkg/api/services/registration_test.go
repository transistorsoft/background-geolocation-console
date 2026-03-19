package services

import (
	"testing"

	"github.com/resistorsoftware/api-service/pkg/api/types"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

func TestFindOrCreateDeviceCreatesNewRowForNewFingerprint(t *testing.T) {
	initServicesTestDB(t)

	db, err := storage.DB()
	if err != nil {
		t.Fatalf("get storage db: %v", err)
	}

	first := types.RegisterRequest{
		DeviceID:     "shared-device-id",
		DeviceModel:  "Pixel 8",
		Framework:    "expo",
		Manufacturer: "Google",
		Model:        "Pixel 8",
		Org:          "acme",
		Platform:     "android",
		UUID:         "uuid-1",
		Version:      "1.0.0",
	}
	companyID, firstRowID, err := FindOrCreateDevice(first.Org, first)
	if err != nil {
		t.Fatalf("register first device: %v", err)
	}

	second := types.RegisterRequest{
		DeviceID:     first.DeviceID,
		DeviceModel:  "iPhone 15",
		Framework:    "react-native",
		Manufacturer: "Apple",
		Model:        "iPhone 15",
		Org:          first.Org,
		Platform:     "ios",
		UUID:         "uuid-2",
		Version:      "2.0.0",
	}
	secondCompanyID, secondRowID, err := FindOrCreateDevice(second.Org, second)
	if err != nil {
		t.Fatalf("register second device: %v", err)
	}

	if secondCompanyID != companyID {
		t.Fatalf("expected shared company id %d, got %d", companyID, secondCompanyID)
	}
	if secondRowID == firstRowID {
		t.Fatalf("expected second registration to create a new row, reused row %d", secondRowID)
	}

	var devices []types.RegisterRequest
	if err := db.Table("devices").
		Select("device_id, device_model, framework, version").
		Where("company_token = ?", first.Org).
		Order("id ASC").
		Find(&devices).Error; err != nil {
		t.Fatalf("load devices: %v", err)
	}

	if len(devices) != 2 {
		t.Fatalf("expected 2 device rows, got %d", len(devices))
	}
	if devices[0].DeviceModel != first.DeviceModel || devices[0].Framework != first.Framework || devices[0].Version != first.Version {
		t.Fatalf("first device row was overwritten: %+v", devices[0])
	}
	if devices[1].DeviceModel != second.DeviceModel || devices[1].Framework != second.Framework || devices[1].Version != second.Version {
		t.Fatalf("second device row mismatch: %+v", devices[1])
	}
}
