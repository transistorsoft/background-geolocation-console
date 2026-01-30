package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/resistorsoftware/api-service/pkg/api/types"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

// ErrNotFound signals that a requested resource does not exist within the caller's scope.
var ErrNotFound = errors.New("record not found")

// ErrForbidden indicates the caller is not allowed to perform the requested action.
var ErrForbidden = errors.New("forbidden")

// CompanySummary is returned to the dashboard UI.
type CompanySummary struct {
	ID           int64  `json:"id"`
	CompanyToken string `json:"company_token"`
}

// DeviceDetails extends the lightweight Device struct with additional metadata.
type DeviceDetails struct {
	ID           int64      `json:"id"`
	CompanyID    int64      `json:"company_id"`
	CompanyToken string     `json:"company_token"`
	DeviceID     string     `json:"device_id"`
	DeviceModel  string     `json:"device_model"`
	Framework    string     `json:"framework"`
	Version      string     `json:"version"`
	CreatedAt    *time.Time `json:"created_at"`
	UpdatedAt    *time.Time `json:"updated_at"`
}

// LocationFilters controls ListLocations queries.
type LocationFilters struct {
	Org       string
	CompanyID *int64
	DeviceID  *int64
	Limit     int
	Start     *time.Time
	End       *time.Time
}

// DeleteDeviceOptions scopes deletion of device or historical data.
type DeleteDeviceOptions struct {
	DeviceID  int64
	Org       string
	CompanyID *int64
	Start     *time.Time
	End       *time.Time
	Admin     bool
}

// ListCompanies returns company rows filtered by token when provided.
func ListCompanies(org string) ([]CompanySummary, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	query := db.WithContext(ctx).Model(&storage.Company{}).Order("id ASC")
	trimmed := strings.TrimSpace(org)
	if trimmed != "" {
		if _, err := ensureCompany(ctx, db.WithContext(ctx), trimmed); err != nil {
			return nil, err
		}
		query = query.Where("company_token = ?", trimmed)
	}
	var rows []storage.Company
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]CompanySummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, CompanySummary{ID: row.ID, CompanyToken: row.CompanyToken})
	}
	return out, nil
}

// ListDevices enumerates devices for the provided org/company scope.
func ListDevices(org string, companyID *int64, admin bool) ([]DeviceDetails, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	query := db.WithContext(ctx).Model(&storage.Device{}).Order("id ASC")
	trimmed := strings.TrimSpace(org)
	if !admin || trimmed != "" {
		query = query.Where("company_token = ?", trimmed)
	}
	if companyID != nil && *companyID != 0 {
		query = query.Where("company_id = ?", *companyID)
	}
	var records []storage.Device
	if err := query.Find(&records).Error; err != nil {
		return nil, err
	}
	out := make([]DeviceDetails, 0, len(records))
	for _, rec := range records {
		out = append(out, DeviceDetails{
			ID:           rec.ID,
			CompanyID:    derefInt64(rec.CompanyID),
			CompanyToken: rec.CompanyToken,
			DeviceID:     rec.DeviceID,
			DeviceModel:  rec.DeviceModel,
			Framework:    rec.Framework,
			Version:      rec.Version,
			CreatedAt:    rec.CreatedAt,
			UpdatedAt:    rec.UpdatedAt,
		})
	}
	return out, nil
}

// ListLocations returns raw JSON payloads matching the filters.
func ListLocations(filters LocationFilters) ([]map[string]any, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	query := buildLocationQuery(ctx, db, filters)

	limit := filters.Limit
	if limit <= 0 {
		limit = 250
	}
	if limit > 2000 {
		limit = 2000
	}

	var rows []storage.Location
	if err := query.Order("recorded_at DESC, id DESC").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		payload := make(map[string]any)
		if len(row.Data) > 0 {
			if err := json.Unmarshal(row.Data, &payload); err != nil {
				payload = make(map[string]any)
			}
		}
		enrichLocationPayload(payload, row)
		out = append(out, payload)
	}
	return out, nil
}

// CountLocations returns the total number of matching locations for the filters.
func CountLocations(filters LocationFilters) (int64, error) {
	db, err := storage.DB()
	if err != nil {
		return 0, err
	}
	ctx := context.Background()
	query := buildLocationQuery(ctx, db, filters)
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// LatestLocation returns the newest matching location.
func LatestLocation(filters LocationFilters) (map[string]any, error) {
	filters.Limit = 1
	results, err := ListLocations(filters)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	return results[0], nil
}

// DeleteDeviceHistory prunes device data or removes the device entirely.
func DeleteDeviceHistory(opts DeleteDeviceOptions) error {
	if opts.DeviceID == 0 {
		return fmt.Errorf("device id required")
	}
	db, err := storage.DB()
	if err != nil {
		return err
	}
	ctx := context.Background()
	query := db.WithContext(ctx).Where("id = ?", opts.DeviceID)
	if !opts.Admin {
		if trimmed := strings.TrimSpace(opts.Org); trimmed != "" {
			query = query.Where("company_token = ?", trimmed)
		}
		if opts.CompanyID != nil && *opts.CompanyID != 0 {
			query = query.Where("company_id = ?", *opts.CompanyID)
		}
	}

	var device storage.Device
	if err := query.First(&device).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}

	// If a date range is supplied, only delete matching locations.
	if opts.Start != nil || opts.End != nil {
		del := db.WithContext(ctx).Where("device_id = ?", device.ID)
		if opts.Start != nil {
			del = del.Where("recorded_at >= ?", opts.Start.UTC())
		}
		if opts.End != nil {
			del = del.Where("recorded_at <= ?", opts.End.UTC())
		}
		return del.Delete(&storage.Location{}).Error
	}

	if !opts.Admin && device.CompanyToken != strings.TrimSpace(opts.Org) {
		return ErrForbidden
	}
	return db.WithContext(ctx).Delete(&device).Error
}

// EnsureDashboardDevice provisions a logical device used by dashboard viewers.
func EnsureDashboardDevice(org string) (int64, int64, error) {
	org = strings.TrimSpace(org)
	if org == "" {
		return 0, 0, errors.New("org required")
	}
	req := dashboardRegisterRequest(org)
	return FindOrCreateDevice(org, req)
}

func dashboardRegisterRequest(org string) types.RegisterRequest {
	token := fmt.Sprintf("%s-dashboard", strings.ToLower(strings.TrimSpace(org)))
	return types.RegisterRequest{
		DeviceID:     token,
		DeviceModel:  "dashboard",
		Framework:    "dashboard",
		Manufacturer: "web",
		Model:        "dashboard",
		Org:          org,
		Platform:     "browser",
		UUID:         token,
		Version:      "1.0.0",
	}
}

func enrichLocationPayload(payload map[string]any, row storage.Location) {
	if payload == nil {
		payload = make(map[string]any)
	}
	if _, ok := payload["id"]; !ok {
		payload["id"] = row.ID
	}
	if _, ok := payload["device_id"]; !ok {
		payload["device_id"] = derefInt(row.DeviceID)
	}
	if _, ok := payload["company_id"]; !ok {
		payload["company_id"] = derefInt(row.CompanyID)
	}
	if _, ok := payload["latitude"]; !ok && row.Latitude != nil {
		payload["latitude"] = *row.Latitude
	}
	if _, ok := payload["longitude"]; !ok && row.Longitude != nil {
		payload["longitude"] = *row.Longitude
	}
	if _, ok := payload["recorded_at"]; !ok && row.RecordedAt != nil {
		payload["recorded_at"] = row.RecordedAt.UTC().Format(time.RFC3339Nano)
	}
	if _, ok := payload["created_at"]; !ok && row.CreatedAt != nil {
		payload["created_at"] = row.CreatedAt.UTC().Format(time.RFC3339Nano)
	}
	if _, ok := payload["uuid"]; !ok && row.UUID != "" {
		payload["uuid"] = row.UUID
	}

	propagateLocationPayload(payload)
}

func resolveCompanyID(ctx context.Context, db *gorm.DB, filters LocationFilters) (*int64, error) {
	if filters.CompanyID != nil && *filters.CompanyID != 0 {
		return filters.CompanyID, nil
	}
	if trimmed := strings.TrimSpace(filters.Org); trimmed != "" {
		company, err := findCompany(ctx, db, trimmed)
		if err != nil {
			return nil, err
		}
		if company == nil {
			return nil, nil
		}
		return &company.ID, nil
	}
	return nil, nil
}

func buildLocationQuery(ctx context.Context, db *gorm.DB, filters LocationFilters) *gorm.DB {
	query := db.WithContext(ctx).Model(&storage.Location{})
	if companyID, err := resolveCompanyID(ctx, db, filters); err == nil && companyID != nil {
		query = query.Where("company_id = ?", *companyID)
	}
	if filters.DeviceID != nil && *filters.DeviceID != 0 {
		query = query.Where("device_id = ?", *filters.DeviceID)
	}
	if filters.Start != nil {
		query = query.Where("recorded_at >= ?", filters.Start.UTC())
	}
	if filters.End != nil {
		query = query.Where("recorded_at <= ?", filters.End.UTC())
	}
	return query
}

func propagateLocationPayload(payload map[string]any) {
	if payload == nil {
		return
	}
	ensureFromPayload(payload, "latitude", "latitude", "location.latitude", "coords.latitude", "location.coords.latitude")
	ensureFromPayload(payload, "longitude", "longitude", "location.longitude", "coords.longitude", "location.coords.longitude")
	ensureFromPayload(payload, "accuracy", "accuracy", "location.coords.accuracy")
	ensureFromPayload(payload, "altitude", "altitude", "location.coords.altitude")
	ensureFromPayload(payload, "heading", "heading", "location.coords.heading")
	ensureFromPayload(payload, "speed", "speed", "location.coords.speed")
	ensureFromPayload(payload, "speed_accuracy", "speed_accuracy", "location.coords.speed_accuracy")
	ensureFromPayload(payload, "heading_accuracy", "heading_accuracy", "location.coords.heading_accuracy")
	ensureFromPayload(payload, "altitude_accuracy", "altitude_accuracy", "location.coords.altitude_accuracy")
	ensureFromPayload(payload, "is_moving", "is_moving", "location.is_moving")
	ensureFromPayload(payload, "odometer", "odometer", "location.odometer")
	ensureFromPayload(payload, "event", "event", "location.event")
	ensureFromPayload(payload, "extras", "extras", "location.extras")
	ensureFromPayload(payload, "age", "age", "location.age")
	ensureFromPayload(payload, "activity_type", "activity_type", "location.activity.type")
	ensureFromPayload(payload, "activity_confidence", "activity_confidence", "location.activity.confidence")
	ensureFromPayload(payload, "battery_level", "battery_level", "location.battery.level")
	ensureFromPayload(payload, "battery_is_charging", "battery_is_charging", "location.battery.is_charging")
	ensureFromPayload(payload, "timestamp", "timestamp", "location.timestamp")
	ensureFromPayload(payload, "recorded_at", "recorded_at", "location.recorded_at", "location.timestamp")
	ensureFromPayload(payload, "uuid", "uuid", "location.uuid")
	ensureFromPayload(payload, "geofence", "geofence", "location.geofence")
}

func ensureFromPayload(payload map[string]any, key string, paths ...string) {
	if _, ok := payload[key]; ok {
		return
	}
	for _, path := range paths {
		if val, ok := lookupValue(payload, path); ok {
			payload[key] = val
			return
		}
	}
}
