package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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

// DisplayName returns the dashboard-friendly device label.
func (d DeviceDetails) DisplayName() string {
	model := strings.TrimSpace(d.DeviceModel)
	deviceID := strings.TrimSpace(d.DeviceID)
	framework := strings.TrimSpace(d.Framework)
	version := strings.TrimSpace(d.Version)

	label := deviceID
	if model != "" {
		if username := deriveUsername(deviceID, model); username != "" {
			label = model + "-" + username
		} else if label == "" {
			label = model
		}
	}
	if label == "" {
		label = "device"
	}
	if framework == "" && version == "" {
		return label
	}
	if framework == "" {
		return fmt.Sprintf("%s (v%s)", label, version)
	}
	if version == "" {
		return fmt.Sprintf("%s (%s)", label, framework)
	}
	return fmt.Sprintf("%s (%s %s)", label, framework, version)
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

// SessionRange describes a contiguous recorded session window.
type SessionRange struct {
	Start *time.Time
	End   *time.Time
	Count int
}

// TimelineSession describes a contiguous cluster of collected location points.
type TimelineSession struct {
	Start time.Time
	End   time.Time
	Count int
}

// LocationTimeline summarizes grouped sessions for a filtered location set.
type LocationTimeline struct {
	Start      *time.Time
	End        *time.Time
	TotalCount int
	Sessions   []TimelineSession
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

// SearchCompanies returns companies whose token loosely matches the supplied query.
func SearchCompanies(query string, limit int) ([]CompanySummary, error) {
	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return nil, nil
	}
	if limit <= 0 {
		limit = 25
	}
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	like := "%" + strings.ToLower(trimmed) + "%"
	var rows []storage.Company
	if err := db.WithContext(ctx).
		Model(&storage.Company{}).
		Where("LOWER(company_token) LIKE ?", like).
		Order("company_token ASC").
		Limit(limit).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]CompanySummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, CompanySummary{ID: row.ID, CompanyToken: row.CompanyToken})
	}
	return out, nil
}

// ListDevices enumerates devices for the provided org/company scope, ordered
// by most recent activity.
func ListDevices(org string, companyID *int64, admin bool) ([]DeviceDetails, error) {
	return listDevices(org, companyID, admin, nil, nil)
}

// ListDevicesInRange enumerates devices but lifts those with locations inside
// the supplied [start, end] window to the top of the result. Within the
// in-range and out-of-range groups, ordering matches ListDevices (most recent
// activity first).
func ListDevicesInRange(org string, companyID *int64, admin bool, start, end *time.Time) ([]DeviceDetails, error) {
	return listDevices(org, companyID, admin, start, end)
}

func listDevices(org string, companyID *int64, admin bool, start, end *time.Time) ([]DeviceDetails, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	query := db.WithContext(ctx).Model(&storage.Device{})

	if expr := devicesInRangeOrderExpr(start, end); expr != "" {
		query = query.Order(expr)
	}
	query = query.
		Order("(SELECT MAX(recorded_at) FROM locations WHERE locations.device_id = devices.id) DESC NULLS LAST").
		Order("id ASC")

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

// devicesInRangeOrderExpr builds a raw ORDER BY clause that prioritises
// devices with at least one location in [start, end]. The time bounds are
// formatted as RFC3339 (no quoting characters of concern), so inlining them
// is safe and avoids the GORM Order-with-vars contortions. Empty when both
// bounds are nil.
func devicesInRangeOrderExpr(start, end *time.Time) string {
	conds := make([]string, 0, 2)
	if start != nil {
		conds = append(conds, fmt.Sprintf("recorded_at >= '%s'", start.UTC().Format(time.RFC3339)))
	}
	if end != nil {
		conds = append(conds, fmt.Sprintf("recorded_at <= '%s'", end.UTC().Format(time.RFC3339)))
	}
	if len(conds) == 0 {
		return ""
	}
	return fmt.Sprintf(
		"EXISTS(SELECT 1 FROM locations WHERE locations.device_id = devices.id AND %s) DESC",
		strings.Join(conds, " AND "),
	)
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
		payload := decodeLocationData(row.Data)
		enrichLocationPayload(payload, row)
		out = append(out, payload)
	}
	return out, nil
}

// StreamLocations writes a JSON array of matching locations to w without
// applying ListLocations' result cap. Rows are iterated one at a time so
// memory use stays bounded regardless of result size.
func StreamLocations(filters LocationFilters, w io.Writer) (int64, error) {
	db, err := storage.DB()
	if err != nil {
		return 0, err
	}
	ctx := context.Background()
	query := buildLocationQuery(ctx, db, filters).Order("recorded_at DESC, id DESC")

	rows, err := query.Rows()
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	if _, err := w.Write([]byte("[")); err != nil {
		return 0, err
	}
	encoder := json.NewEncoder(w)
	var count int64
	for rows.Next() {
		var row storage.Location
		if err := db.ScanRows(rows, &row); err != nil {
			return count, err
		}
		if count > 0 {
			if _, err := w.Write([]byte(",")); err != nil {
				return count, err
			}
		}
		payload := decodeLocationData(row.Data)
		enrichLocationPayload(payload, row)
		if err := encoder.Encode(payload); err != nil {
			return count, err
		}
		count++
	}
	if err := rows.Err(); err != nil {
		return count, err
	}
	if _, err := w.Write([]byte("]")); err != nil {
		return count, err
	}
	return count, nil
}

// LocationLookup describes a single location resolved by UUID along with the
// device it belongs to and the contiguous session of points it sits inside,
// sufficient for the dashboard to navigate to it and render its cluster with
// the UUID highlighted.
type LocationLookup struct {
	UUID         string         `json:"uuid"`
	DeviceID     int64          `json:"device_id"`
	DeviceLabel  string         `json:"device_id_string"`
	CompanyID    int64          `json:"company_id"`
	CompanyToken string         `json:"company_token"`
	RecordedAt   *time.Time     `json:"recorded_at"`
	Latitude     *float64       `json:"latitude,omitempty"`
	Longitude    *float64       `json:"longitude,omitempty"`
	Payload      map[string]any `json:"payload"`
	SessionStart *time.Time     `json:"session_start,omitempty"`
	SessionEnd   *time.Time     `json:"session_end,omitempty"`
	SessionCount int            `json:"session_count,omitempty"`
}

// FindLocationByUUID returns the single location matching the supplied UUID
// scoped to the org. Returns (nil, nil) when nothing is found so callers can
// distinguish a miss from an error.
func FindLocationByUUID(org, uuid string) (*LocationLookup, error) {
	uuid = strings.TrimSpace(uuid)
	org = strings.TrimSpace(org)
	if uuid == "" || org == "" {
		return nil, nil
	}
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	company, err := findCompany(ctx, db, org)
	if err != nil {
		return nil, err
	}
	if company == nil {
		return nil, nil
	}
	var loc storage.Location
	if err := db.WithContext(ctx).
		Where("uuid = ? AND company_id = ?", uuid, company.ID).
		First(&loc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	deviceID := derefInt64(loc.DeviceID)
	deviceLabel := ""
	if deviceID != 0 {
		var dev storage.Device
		if err := db.WithContext(ctx).
			Select("device_id").
			Where("id = ?", deviceID).
			First(&dev).Error; err == nil {
			deviceLabel = dev.DeviceID
		}
	}
	payload := decodeLocationData(loc.Data)
	enrichLocationPayload(payload, loc)
	result := &LocationLookup{
		UUID:         loc.UUID,
		DeviceID:     deviceID,
		DeviceLabel:  deviceLabel,
		CompanyID:    company.ID,
		CompanyToken: company.CompanyToken,
		RecordedAt:   loc.RecordedAt,
		Latitude:     loc.Latitude,
		Longitude:    loc.Longitude,
		Payload:      payload,
	}
	if loc.RecordedAt != nil && deviceID > 0 {
		if session, sErr := FindDeviceSessionAround(deviceID, loc.RecordedAt.UTC(), 0); sErr == nil && session != nil {
			result.SessionStart = session.Start
			result.SessionEnd = session.End
			result.SessionCount = session.Count
		}
	}
	return result, nil
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

// LocationRange returns the oldest and newest recorded_at timestamps for matching locations.
func LocationRange(filters LocationFilters) (*time.Time, *time.Time, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, nil, err
	}
	ctx := context.Background()
	query := buildLocationQuery(ctx, db, filters)
	var row struct {
		Start *time.Time `gorm:"column:start"`
		End   *time.Time `gorm:"column:end"`
	}
	if err := query.Select("MIN(recorded_at) as start, MAX(recorded_at) as end").Scan(&row).Error; err != nil {
		return nil, nil, err
	}
	return row.Start, row.End, nil
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

// FindDeviceSessionAround locates the contiguous session containing anchor for
// the given device. A session is a run of recorded_at values whose adjacent
// gaps are all <= maxGap. The returned range always includes anchor; if it
// is the only matching record the start and end will both equal anchor.
func FindDeviceSessionAround(deviceID int64, anchor time.Time, maxGap time.Duration) (*SessionRange, error) {
	if deviceID <= 0 {
		return nil, nil
	}
	if maxGap <= 0 {
		maxGap = 30 * time.Minute
	}
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()

	sessionStart := anchor.UTC()
	sessionEnd := anchor.UTC()
	count := 1

	var earlier []storage.Location
	if err := db.WithContext(ctx).
		Where("device_id = ? AND recorded_at < ?", deviceID, anchor).
		Order("recorded_at DESC").
		Limit(2000).
		Find(&earlier).Error; err != nil {
		return nil, err
	}
	prev := sessionStart
	for _, row := range earlier {
		if row.RecordedAt == nil {
			continue
		}
		ts := row.RecordedAt.UTC()
		if prev.Sub(ts) > maxGap {
			break
		}
		sessionStart = ts
		prev = ts
		count++
	}

	var later []storage.Location
	if err := db.WithContext(ctx).
		Where("device_id = ? AND recorded_at > ?", deviceID, anchor).
		Order("recorded_at ASC").
		Limit(2000).
		Find(&later).Error; err != nil {
		return nil, err
	}
	prev = sessionEnd
	for _, row := range later {
		if row.RecordedAt == nil {
			continue
		}
		ts := row.RecordedAt.UTC()
		if ts.Sub(prev) > maxGap {
			break
		}
		sessionEnd = ts
		prev = ts
		count++
	}

	return &SessionRange{
		Start: &sessionStart,
		End:   &sessionEnd,
		Count: count,
	}, nil
}

// LatestSessionRange returns the newest contiguous session for the filters.
func LatestSessionRange(filters LocationFilters, maxGap time.Duration) (*SessionRange, error) {
	if maxGap <= 0 {
		maxGap = 30 * time.Minute
	}
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	sessionFilters := filters
	sessionFilters.Start = nil
	sessionFilters.End = nil
	query := buildLocationQuery(ctx, db, sessionFilters)

	var rows []storage.Location
	if err := query.Order("recorded_at DESC, id DESC").Limit(2000).Find(&rows).Error; err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}

	latest := rows[0].RecordedAt
	if latest == nil {
		return nil, nil
	}
	session := &SessionRange{
		Start: latest,
		End:   latest,
		Count: 1,
	}
	prev := latest.UTC()
	for _, row := range rows[1:] {
		if row.RecordedAt == nil {
			break
		}
		current := row.RecordedAt.UTC()
		if prev.Sub(current) > maxGap {
			break
		}
		ts := current
		session.Start = &ts
		session.Count++
		prev = current
	}
	return session, nil
}

// BuildLocationTimeline groups matching locations into contiguous sessions.
func BuildLocationTimeline(filters LocationFilters, maxGap time.Duration) (*LocationTimeline, error) {
	if maxGap <= 0 {
		maxGap = 30 * time.Minute
	}
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	query := buildLocationQuery(ctx, db, filters)

	var rows []struct {
		RecordedAt *time.Time `gorm:"column:recorded_at"`
	}
	if err := query.Select("recorded_at").Order("recorded_at ASC, id ASC").Find(&rows).Error; err != nil {
		return nil, err
	}

	timeline := &LocationTimeline{
		Sessions: make([]TimelineSession, 0),
	}
	var current *TimelineSession
	for _, row := range rows {
		if row.RecordedAt == nil {
			continue
		}
		ts := row.RecordedAt.UTC()
		timeline.TotalCount++
		if timeline.Start == nil {
			start := ts
			timeline.Start = &start
		}
		end := ts
		timeline.End = &end

		if current == nil {
			timeline.Sessions = append(timeline.Sessions, TimelineSession{
				Start: ts,
				End:   ts,
				Count: 1,
			})
			current = &timeline.Sessions[len(timeline.Sessions)-1]
			continue
		}

		if ts.Sub(current.End) > maxGap {
			timeline.Sessions = append(timeline.Sessions, TimelineSession{
				Start: ts,
				End:   ts,
				Count: 1,
			})
			current = &timeline.Sessions[len(timeline.Sessions)-1]
			continue
		}

		current.End = ts
		current.Count++
	}

	return timeline, nil
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

func deriveUsername(deviceID, model string) string {
	deviceID = strings.TrimSpace(deviceID)
	model = strings.TrimSpace(model)
	if deviceID == "" || model == "" {
		return ""
	}
	prefix := model + "-"
	if strings.HasPrefix(deviceID, prefix) {
		return strings.TrimSpace(strings.TrimPrefix(deviceID, prefix))
	}
	return ""
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
	ensureFromPayload(payload, "latitude", "latitude", "location.latitude", "coords.latitude", "location.coords.latitude", "data.coords.latitude", "data.location.coords.latitude")
	ensureFromPayload(payload, "longitude", "longitude", "location.longitude", "coords.longitude", "location.coords.longitude", "data.coords.longitude", "data.location.coords.longitude")
	ensureFromPayload(payload, "coords", "coords", "location.coords", "data.coords", "data.location.coords")
	ensureFromPayload(payload, "accuracy", "accuracy", "coords.accuracy", "location.coords.accuracy", "data.coords.accuracy", "data.location.coords.accuracy")
	ensureFromPayload(payload, "altitude", "altitude", "coords.altitude", "location.coords.altitude", "data.coords.altitude", "data.location.coords.altitude")
	ensureFromPayload(payload, "heading", "heading", "location.heading", "location.coords.heading", "coords.heading", "data.heading", "data.location.heading", "data.location.coords.heading")
	ensureFromPayload(payload, "speed", "speed", "coords.speed", "location.coords.speed", "data.coords.speed", "data.location.coords.speed")
	ensureFromPayload(payload, "speed_accuracy", "speed_accuracy", "coords.speed_accuracy", "location.coords.speed_accuracy", "data.coords.speed_accuracy", "data.location.coords.speed_accuracy")
	ensureFromPayload(payload, "heading_accuracy", "heading_accuracy", "coords.heading_accuracy", "location.coords.heading_accuracy", "data.coords.heading_accuracy", "data.location.coords.heading_accuracy")
	ensureFromPayload(payload, "altitude_accuracy", "altitude_accuracy", "coords.altitude_accuracy", "location.coords.altitude_accuracy", "data.coords.altitude_accuracy", "data.location.coords.altitude_accuracy")
	ensureFromPayload(payload, "is_moving", "is_moving", "location.is_moving", "data.is_moving", "location.data.is_moving")
	ensureFromPayload(payload, "odometer", "odometer", "location.odometer", "data.odometer", "location.data.odometer")
	ensureFromPayload(payload, "event", "event", "location.event", "data.event", "location.data.event")
	ensureFromPayload(payload, "extras", "extras", "location.extras", "data.extras", "location.data.extras")
	ensureFromPayload(payload, "age", "age", "location.age", "data.age", "location.data.age")
	ensureFromPayload(payload, "activity_type", "activity_type", "activity.type", "location.activity.type", "data.activity.type", "location.data.activity.type")
	ensureFromPayload(payload, "activity_confidence", "activity_confidence", "activity.confidence", "location.activity.confidence", "data.activity.confidence", "location.data.activity.confidence")
	ensureFromPayload(payload, "battery_level", "battery_level", "battery.level", "location.battery.level", "data.battery.level", "location.data.battery.level")
	ensureFromPayload(payload, "battery_is_charging", "battery_is_charging", "battery.is_charging", "location.battery.is_charging", "data.battery.is_charging", "location.data.battery.is_charging")
	ensureFromPayload(payload, "timestamp", "timestamp", "location.timestamp")
	ensureFromPayload(payload, "recorded_at", "recorded_at", "location.recorded_at", "location.timestamp", "data.recorded_at", "data.timestamp")
	ensureFromPayload(payload, "uuid", "uuid", "location.uuid", "data.uuid", "data.location.uuid")
	ensureFromPayload(payload, "geofence", "geofence", "location.geofence")
}

func decodeLocationData(raw []byte) map[string]any {
	payload := make(map[string]any)
	if len(raw) == 0 {
		return payload
	}
	if err := json.Unmarshal(raw, &payload); err == nil {
		return payload
	}
	var encoded string
	if err := json.Unmarshal(raw, &encoded); err != nil {
		return make(map[string]any)
	}
	trimmed := strings.TrimSpace(encoded)
	if trimmed == "" {
		return make(map[string]any)
	}
	if err := json.Unmarshal([]byte(trimmed), &payload); err != nil {
		return make(map[string]any)
	}
	return payload
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
