package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/types"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

const (
	defaultLocationRetention = 30 * 24 * time.Hour
)

// Device is a lightweight view returned to callers when fetching device metadata.
type Device struct {
	ID        int64
	CompanyID int64
	Org       string
}

// FindOrCreateDevice ensures a company and device exist for the provided registration request.
func FindOrCreateDevice(org string, req types.RegisterRequest) (companyID, deviceID int64, err error) {
	db, err := storage.DB()
	if err != nil {
		return 0, 0, err
	}
	ctx := context.Background()
	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		company, err := ensureCompany(ctx, tx, org)
		if err != nil {
			return err
		}
		companyID = company.ID

		var record storage.Device
		now := time.Now().UTC()
		model := firstNonEmpty(req.DeviceModel, req.Model)
		err = tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("company_token = ? AND device_id = ?", org, req.DeviceID).
			First(&record).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				record = storage.Device{
					CompanyID:    &company.ID,
					CompanyToken: org,
					DeviceID:     req.DeviceID,
					DeviceModel:  model,
					Framework:    req.Framework,
					Version:      req.Version,
					CreatedAt:    timestampPtr(now),
					UpdatedAt:    timestampPtr(now),
				}
				if err := tx.Create(&record).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		} else {
			update := map[string]any{
				"updated_at": now,
				"framework":  req.Framework,
				"version":    req.Version,
			}
			if model != "" {
				update["device_model"] = model
			}
			if record.CompanyID == nil || *record.CompanyID == 0 {
				update["company_id"] = company.ID
			}
			if err := tx.Model(&record).Updates(update).Error; err != nil {
				return err
			}
		}
		deviceID = record.ID
		return nil
	})
	if err != nil {
		return 0, 0, err
	}
	return companyID, deviceID, nil
}

// GetDeviceByID returns a device if it belongs to the supplied org.
func GetDeviceByID(id int64, org string) (*Device, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	var record storage.Device
	query := db.WithContext(ctx).Where("id = ?", id)
	if strings.TrimSpace(org) != "" {
		query = query.Where("company_token = ?", org)
	}
	if err := query.First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return toDevice(record), nil
}

// GetDevices returns a collection of devices scoped by org and optional company identifier.
func GetDevices(org string, admin bool, companyID *int64) ([]Device, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	var records []storage.Device
	query := db.WithContext(ctx).Model(&storage.Device{})
	if admin {
		if companyID != nil && *companyID != 0 {
			query = query.Where("company_id = ?", *companyID)
		} else if strings.TrimSpace(org) != "" {
			query = query.Where("company_token = ?", org)
		}
	} else {
		query = query.Where("company_token = ?", org)
		if companyID != nil && *companyID != 0 {
			query = query.Where("company_id = ?", *companyID)
		}
	}
	if err := query.Order("id ASC").Find(&records).Error; err != nil {
		return nil, err
	}
	out := make([]Device, 0, len(records))
	for _, rec := range records {
		if dev := toDevice(rec); dev != nil {
			out = append(out, *dev)
		}
	}
	return out, nil
}

// CreateLocation persists a location for a known device.
func CreateLocation(data map[string]any, org string, device *Device) error {
	if device == nil {
		return errors.New("device is required")
	}
	db, err := storage.DB()
	if err != nil {
		return err
	}
	ctx := context.Background()
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var companyID int64
		if device.CompanyID != 0 {
			companyID = device.CompanyID
		} else {
			company, err := ensureCompany(ctx, tx, org)
			if err != nil {
				return err
			}
			companyID = company.ID
		}
		loc, err := buildLocationRecord(data, companyID, device.ID)
		if err != nil {
			return err
		}
		return tx.Create(loc).Error
	})
}

// RemoveOld prunes stale locations for the given org using a default retention window.
func RemoveOld(org string) error {
	db, err := storage.DB()
	if err != nil {
		return err
	}
	ctx := context.Background()
	company, err := findCompany(ctx, db, org)
	if err != nil || company == nil {
		return err
	}
	cutoff := time.Now().UTC().Add(-defaultLocationRetention)
	return db.WithContext(ctx).
		Where("company_id = ? AND recorded_at < ?", company.ID, cutoff).
		Delete(&storage.Location{}).Error
}

// IsDDosCompany respects the denylist configured in server.toml.
func IsDDosCompany(org string) bool {
	cfg, err := config.Access()
	if err != nil {
		return false
	}
	for _, token := range enumerateTokens(cfg.DDoSBombCompanyTokens) {
		if strings.EqualFold(token, org) {
			return true
		}
	}
	return false
}

func enumerateTokens(tokens []string) []string {
	out := make([]string, 0, len(tokens))
	for _, t := range tokens {
		if trimmed := strings.TrimSpace(t); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func toDevice(d storage.Device) *Device {
	var companyID int64
	if d.CompanyID != nil {
		companyID = *d.CompanyID
	}
	return &Device{
		ID:        d.ID,
		CompanyID: companyID,
		Org:       d.CompanyToken,
	}
}

func ensureCompany(ctx context.Context, db *gorm.DB, org string) (*storage.Company, error) {
	if strings.TrimSpace(org) == "" {
		return nil, errors.New("organization token missing")
	}
	var company storage.Company
	now := time.Now().UTC()
	err := db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("company_token = ?", org).
		First(&company).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			company = storage.Company{
				CompanyToken: org,
				CreatedAt:    timestampPtr(now),
				UpdatedAt:    timestampPtr(now),
			}
			if err := db.Create(&company).Error; err != nil {
				return nil, err
			}
			return &company, nil
		}
		return nil, err
	}
	if err := db.Model(&company).Update("updated_at", now).Error; err != nil {
		return nil, err
	}
	return &company, nil
}

func findCompany(ctx context.Context, db *gorm.DB, org string) (*storage.Company, error) {
	if strings.TrimSpace(org) == "" {
		return nil, nil
	}
	var company storage.Company
	if err := db.WithContext(ctx).Where("company_token = ?", org).First(&company).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &company, nil
}

func buildLocationRecord(data map[string]any, companyID, deviceID int64) (*storage.Location, error) {
	payload, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("marshal location payload: %w", err)
	}
	now := time.Now().UTC()
	recordedAt := extractTime(data, "recorded_at", "recordedAt", "timestamp", "time", "location.timestamp", "location.recorded_at")
	if recordedAt == nil {
		recordedAt = timestampPtr(now)
	}
	loc := &storage.Location{
		CompanyID:  intPtr(companyID),
		DeviceID:   intPtr(deviceID),
		Latitude:   extractFloat(data, "latitude", "lat", "coords.latitude", "location.latitude"),
		Longitude:  extractFloat(data, "longitude", "lng", "coords.longitude", "location.longitude"),
		RecordedAt: recordedAt,
		CreatedAt:  timestampPtr(now),
		Data:       datatypes.JSON(payload),
		UUID:       extractString(data, "uuid", "location.uuid", "id"),
	}
	return loc, nil
}

func extractFloat(data map[string]any, keys ...string) *float64 {
	for _, key := range keys {
		if val, ok := lookupValue(data, key); ok {
			switch v := val.(type) {
			case float64:
				return floatPtr(v)
			case float32:
				return floatPtr(float64(v))
			case int:
				return floatPtr(float64(v))
			case int64:
				return floatPtr(float64(v))
			case string:
				if parsed, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
					return floatPtr(parsed)
				}
			}
		}
	}
	return nil
}

func extractTime(data map[string]any, keys ...string) *time.Time {
	for _, key := range keys {
		if val, ok := lookupValue(data, key); ok {
			switch v := val.(type) {
			case string:
				if ts, err := parseTimeString(v); err == nil {
					return ts
				}
			case float64:
				if ts := parseNumericTime(v); ts != nil {
					return ts
				}
			case int:
				if ts := parseNumericTime(float64(v)); ts != nil {
					return ts
				}
			case int64:
				if ts := parseNumericTime(float64(v)); ts != nil {
					return ts
				}
			}
		}
	}
	return nil
}

func parseTimeString(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, errors.New("empty time string")
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05Z07:00",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		if ts, err := time.Parse(layout, value); err == nil {
			t := ts.UTC()
			return &t, nil
		}
	}
	// handle numeric encoded as string
	if numeric, err := strconv.ParseFloat(value, 64); err == nil {
		if ts := parseNumericTime(numeric); ts != nil {
			return ts, nil
		}
	}
	return nil, fmt.Errorf("unable to parse time %q", value)
}

func parseNumericTime(value float64) *time.Time {
	if value == 0 {
		return nil
	}
	var ts time.Time
	if value > 1e12 {
		ts = time.UnixMilli(int64(value))
	} else if value > 1e9 {
		ts = time.Unix(int64(value), 0)
	} else {
		return nil
	}
	t := ts.UTC()
	return &t
}

func extractString(data map[string]any, keys ...string) string {
	for _, key := range keys {
		if val, ok := lookupValue(data, key); ok {
			switch v := val.(type) {
			case string:
				if trimmed := strings.TrimSpace(v); trimmed != "" {
					return trimmed
				}
			case fmt.Stringer:
				return v.String()
			}
		}
	}
	return ""
}

func lookupValue(data map[string]any, path string) (any, bool) {
	current := any(data)
	segments := strings.Split(path, ".")
	for _, segment := range segments {
		m, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		next, ok := m[segment]
		if !ok {
			return nil, false
		}
		current = next
	}
	return current, true
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if trimmed := strings.TrimSpace(v); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func floatPtr(v float64) *float64 {
	return &v
}

func intPtr(v int64) *int64 {
	return &v
}

func timestampPtr(t time.Time) *time.Time {
	val := t.UTC()
	return &val
}

func derefInt(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}

func derefInt64(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}
