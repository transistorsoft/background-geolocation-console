package services

import (
	"context"
	"database/sql/driver"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

func isRecordNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}

// nullableTime scans an aggregate timestamp that may arrive as a time.Time
// (Postgres) or a string/[]byte (SQLite), and may be NULL.
type nullableTime struct {
	value *time.Time
}

// Value implements driver.Valuer so GORM treats this as a scalar field, not a relation.
func (n nullableTime) Value() (driver.Value, error) {
	if n.value == nil {
		return nil, nil
	}
	return *n.value, nil
}

func (n *nullableTime) Scan(src any) error {
	switch v := src.(type) {
	case nil:
		n.value = nil
	case time.Time:
		t := v.UTC()
		n.value = &t
	case string:
		if t, err := parseTimeString(v); err == nil {
			n.value = t
		}
	case []byte:
		if t, err := parseTimeString(string(v)); err == nil {
			n.value = t
		}
	}
	return nil
}

// ProtectedCompanyPrefix is reserved for tokens created by an administrator.
// External registration attempts using this prefix are rejected.
const ProtectedCompanyPrefix = "_transistor"

// IsProtectedCompanyToken reports whether the supplied org token is reserved for
// administrator-created companies.
func IsProtectedCompanyToken(org string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(org)), ProtectedCompanyPrefix)
}

// BannedStopPayload returns the HTTP status and JSON body sent to a banned
// company or device. The body instructs the background-geolocation SDK to stop()
// sending location data.
//
// The SDK expects an array of action arrays, so a stop directive marshals as:
//
//	{"background_geolocation": [["stop"]]}
func BannedStopPayload() (int, map[string]any) {
	return 200, map[string]any{
		"background_geolocation": []any{[]any{"stop"}},
	}
}

// CompanyBanned reports whether the company identified by org is banned.
func CompanyBanned(org string) (bool, error) {
	if strings.TrimSpace(org) == "" {
		return false, nil
	}
	db, err := storage.DB()
	if err != nil {
		return false, err
	}
	var company storage.Company
	err = db.WithContext(context.Background()).
		Select("banned").
		Where("company_token = ?", strings.TrimSpace(org)).
		First(&company).Error
	if err != nil {
		// Unknown company is not banned; surface only real errors.
		if isRecordNotFound(err) {
			return false, nil
		}
		return false, err
	}
	return company.Banned, nil
}

// CompanyExists reports whether a company row with the given org token exists.
// Unlike ensureCompany/FindOrCreateDevice it never creates a row; it is used to
// gate registration under the reserved ProtectedCompanyPrefix, which must be
// provisioned by an administrator before a device may register against it.
func CompanyExists(org string) (bool, error) {
	trimmed := strings.TrimSpace(org)
	if trimmed == "" {
		return false, nil
	}
	db, err := storage.DB()
	if err != nil {
		return false, err
	}
	var company storage.Company
	err = db.WithContext(context.Background()).
		Select("id").
		Where("company_token = ?", trimmed).
		First(&company).Error
	if err != nil {
		if isRecordNotFound(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// IsDeniedCompany reports whether the org appears in the configured denylist.
func IsDeniedCompany(org string) bool {
	cfg, err := config.Access()
	if err != nil {
		return false
	}
	for _, token := range enumerateTokens(cfg.DeniedCompanyTokens) {
		if strings.EqualFold(token, strings.TrimSpace(org)) {
			return true
		}
	}
	return false
}

// IsDeniedDevice reports whether the device token appears in the configured denylist.
func IsDeniedDevice(deviceToken string) bool {
	cfg, err := config.Access()
	if err != nil {
		return false
	}
	for _, token := range enumerateTokens(cfg.DeniedDeviceTokens) {
		if strings.EqualFold(token, strings.TrimSpace(deviceToken)) {
			return true
		}
	}
	return false
}

// AdminCreateCompany provisions a company row for an administrator, bypassing the
// protected-prefix guard that blocks external callers.
func AdminCreateCompany(org string) (*CompanySummary, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	company, err := ensureCompany(ctx, db, strings.TrimSpace(org))
	if err != nil {
		return nil, err
	}
	return &CompanySummary{ID: company.ID, CompanyToken: company.CompanyToken}, nil
}

// BanCompany flags a company as banned with an optional reason.
func BanCompany(org, reason string) error {
	return setCompanyBanned(org, true, reason)
}

// UnbanCompany clears the banned flag on a company.
func UnbanCompany(org string) error {
	return setCompanyBanned(org, false, "")
}

func setCompanyBanned(org string, banned bool, reason string) error {
	trimmed := strings.TrimSpace(org)
	if trimmed == "" {
		return ErrNotFound
	}
	db, err := storage.DB()
	if err != nil {
		return err
	}
	updates := map[string]any{"banned": banned}
	if banned {
		now := time.Now().UTC()
		updates["banned_at"] = &now
		updates["banned_reason"] = strings.TrimSpace(reason)
	} else {
		updates["banned_at"] = nil
		updates["banned_reason"] = ""
	}
	res := db.WithContext(context.Background()).
		Model(&storage.Company{}).
		Where("company_token = ?", trimmed).
		Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteCompanyAndData removes a company together with all of its devices and
// location data. Children are deleted explicitly (the schema's FK cascade is not
// guaranteed because AutoMigrate creates the tables without FK constraints).
func DeleteCompanyAndData(org string) error {
	trimmed := strings.TrimSpace(org)
	if trimmed == "" {
		return ErrNotFound
	}
	db, err := storage.DB()
	if err != nil {
		return err
	}
	ctx := context.Background()
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var company storage.Company
		if err := tx.Where("company_token = ?", trimmed).First(&company).Error; err != nil {
			if isRecordNotFound(err) {
				return ErrNotFound
			}
			return err
		}
		if err := tx.Where("company_id = ?", company.ID).Delete(&storage.Location{}).Error; err != nil {
			return err
		}
		if err := tx.Where("company_id = ?", company.ID).Delete(&storage.Device{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", company.ID).Delete(&storage.Company{}).Error
	})
}

// DeleteDeviceAndData removes a device together with all of its location data.
func DeleteDeviceAndData(deviceID int64) error {
	if deviceID <= 0 {
		return ErrNotFound
	}
	db, err := storage.DB()
	if err != nil {
		return err
	}
	ctx := context.Background()
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var device storage.Device
		if err := tx.Where("id = ?", deviceID).First(&device).Error; err != nil {
			if isRecordNotFound(err) {
				return ErrNotFound
			}
			return err
		}
		if err := tx.Where("device_id = ?", device.ID).Delete(&storage.Location{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", device.ID).Delete(&storage.Device{}).Error
	})
}

// PurgeExpiredLocations deletes every location older than the retention window,
// across all companies. It returns the number of rows removed.
func PurgeExpiredLocations(retention time.Duration) (int64, error) {
	db, err := storage.DB()
	if err != nil {
		return 0, err
	}
	if retention <= 0 {
		retention = defaultLocationRetention
	}
	cutoff := time.Now().UTC().Add(-retention)
	res := db.WithContext(context.Background()).
		Where("recorded_at < ?", cutoff).
		Delete(&storage.Location{})
	if res.Error != nil {
		return 0, res.Error
	}
	return res.RowsAffected, nil
}

// CompanyActivity captures one company's location/device counts within a window.
type CompanyActivity struct {
	CompanyID     int64      `json:"company_id"`
	CompanyToken  string     `json:"company_token"`
	Banned        bool       `json:"banned"`
	DeviceCount   int64      `json:"device_count"`
	LocationCount int64      `json:"location_count"`
	FirstRecorded *time.Time `json:"first_recorded"`
	LastRecorded  *time.Time `json:"last_recorded"`
}

// ActivitySummary aggregates per-company activity plus min/max/avg metrics across
// the companies that posted data inside the window.
type ActivitySummary struct {
	Window         time.Duration     `json:"window_seconds"`
	GeneratedAt    time.Time         `json:"generated_at"`
	Companies      []CompanyActivity `json:"companies"`
	ActiveCount    int               `json:"active_count"`
	TotalLocations int64             `json:"total_locations"`
	MinLocations   int64             `json:"min_locations"`
	MaxLocations   int64             `json:"max_locations"`
	AvgLocations   float64           `json:"avg_locations"`
}

// RecentActivity returns per-company location/device counts within the window
// (default 24h when window <= 0), ordered by location count descending. Min/max/avg
// are computed over the companies that actually posted data inside the window.
func RecentActivity(window time.Duration) (*ActivitySummary, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	if window <= 0 {
		window = 24 * time.Hour
	}
	now := time.Now().UTC()
	cutoff := now.Add(-window)

	type companyActivityScan struct {
		CompanyID     int64
		CompanyToken  string
		Banned        bool
		DeviceCount   int64
		LocationCount int64
		FirstRecorded nullableTime
		LastRecorded  nullableTime
	}
	var scanned []companyActivityScan
	// LEFT JOIN with the time predicate inside the ON clause so companies with no
	// recent activity still appear (with zero counts).
	err = db.WithContext(context.Background()).
		Table("companies").
		Select(`companies.id AS company_id,
			companies.company_token AS company_token,
			companies.banned AS banned,
			COUNT(locations.id) AS location_count,
			COUNT(DISTINCT locations.device_id) AS device_count,
			MIN(locations.recorded_at) AS first_recorded,
			MAX(locations.recorded_at) AS last_recorded`).
		Joins("LEFT JOIN locations ON locations.company_id = companies.id AND locations.recorded_at >= ?", cutoff).
		Group("companies.id, companies.company_token, companies.banned").
		Order("location_count DESC, companies.company_token ASC").
		Scan(&scanned).Error
	if err != nil {
		return nil, err
	}

	rows := make([]CompanyActivity, 0, len(scanned))
	for _, s := range scanned {
		rows = append(rows, CompanyActivity{
			CompanyID:     s.CompanyID,
			CompanyToken:  s.CompanyToken,
			Banned:        s.Banned,
			DeviceCount:   s.DeviceCount,
			LocationCount: s.LocationCount,
			FirstRecorded: s.FirstRecorded.value,
			LastRecorded:  s.LastRecorded.value,
		})
	}

	summary := &ActivitySummary{
		Window:      window,
		GeneratedAt: now,
		Companies:   rows,
	}
	first := true
	for _, row := range rows {
		summary.TotalLocations += row.LocationCount
		if row.LocationCount <= 0 {
			continue
		}
		summary.ActiveCount++
		if first || row.LocationCount < summary.MinLocations {
			summary.MinLocations = row.LocationCount
		}
		if first || row.LocationCount > summary.MaxLocations {
			summary.MaxLocations = row.LocationCount
		}
		first = false
	}
	if summary.ActiveCount > 0 {
		summary.AvgLocations = float64(summary.TotalLocations) / float64(summary.ActiveCount)
	}
	return summary, nil
}

// ActivityQuery parameterizes a paged, sortable recent-activity listing.
type ActivityQuery struct {
	Window  time.Duration
	Sort    string // locations | devices | token | last_seen
	Dir     string // asc | desc
	Page    int    // 1-based
	PerPage int
}

// ActivityPage is one page of company activity plus window-wide summary metrics.
type ActivityPage struct {
	Companies      []CompanyActivity `json:"companies"`
	Window         time.Duration     `json:"window_seconds"`
	WindowHours    int               `json:"window_hours"`
	GeneratedAt    time.Time         `json:"generated_at"`
	Page           int               `json:"page"`
	PerPage        int               `json:"per_page"`
	TotalCompanies int64             `json:"total_companies"`
	TotalPages     int               `json:"total_pages"`
	Sort           string            `json:"sort"`
	Dir            string            `json:"dir"`
	ActiveCount    int64             `json:"active_count"`
	TotalLocations int64             `json:"total_locations"`
	MinLocations   int64             `json:"min_locations"`
	MaxLocations   int64             `json:"max_locations"`
	AvgLocations   float64           `json:"avg_locations"`
}

// activitySortColumns whitelists user-supplied sort keys to SQL order expressions.
var activitySortColumns = map[string]string{
	"locations": "location_count",
	"devices":   "device_count",
	"token":     "companies.company_token",
	"last_seen": "last_recorded",
}

// RecentActivityPaged returns a single page of company activity ordered/paged per
// the query, along with summary metrics computed over all active companies in the
// window. Sort and direction are whitelisted; defaults are locations/desc/25.
func RecentActivityPaged(q ActivityQuery) (*ActivityPage, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	window := q.Window
	if window <= 0 {
		window = 24 * time.Hour
	}
	perPage := q.PerPage
	if perPage <= 0 {
		perPage = 25
	}
	if perPage > 200 {
		perPage = 200
	}
	page := q.Page
	if page <= 0 {
		page = 1
	}
	sortKey := strings.ToLower(strings.TrimSpace(q.Sort))
	orderCol, ok := activitySortColumns[sortKey]
	if !ok {
		sortKey = "locations"
		orderCol = activitySortColumns[sortKey]
	}
	dir := strings.ToLower(strings.TrimSpace(q.Dir))
	if dir != "asc" {
		dir = "desc"
	}

	now := time.Now().UTC()
	cutoff := now.Add(-window)
	ctx := context.Background()

	out := &ActivityPage{
		Window:      window,
		WindowHours: int(window / time.Hour),
		GeneratedAt: now,
		Page:        page,
		PerPage:     perPage,
		Sort:        sortKey,
		Dir:         dir,
	}

	// Total companies (for paging).
	if err := db.WithContext(ctx).Model(&storage.Company{}).Count(&out.TotalCompanies).Error; err != nil {
		return nil, err
	}
	out.TotalPages = int((out.TotalCompanies + int64(perPage) - 1) / int64(perPage))
	if out.TotalPages == 0 {
		out.TotalPages = 1
	}
	if page > out.TotalPages {
		page = out.TotalPages
		out.Page = page
	}

	// Window-wide summary over active companies.
	var metrics struct {
		ActiveCount    int64
		TotalLocations int64
		MinLocations   int64
		MaxLocations   int64
		AvgLocations   float64
	}
	subQuery := db.WithContext(ctx).
		Table("companies").
		Select("COUNT(locations.id) AS loc").
		Joins("LEFT JOIN locations ON locations.company_id = companies.id AND locations.recorded_at >= ?", cutoff).
		Group("companies.id").
		Having("COUNT(locations.id) > 0")
	if err := db.WithContext(ctx).
		Table("(?) AS t", subQuery).
		Select("COUNT(*) AS active_count, COALESCE(SUM(loc),0) AS total_locations, COALESCE(MIN(loc),0) AS min_locations, COALESCE(MAX(loc),0) AS max_locations, COALESCE(AVG(loc),0) AS avg_locations").
		Scan(&metrics).Error; err != nil {
		return nil, err
	}
	out.ActiveCount = metrics.ActiveCount
	out.TotalLocations = metrics.TotalLocations
	out.MinLocations = metrics.MinLocations
	out.MaxLocations = metrics.MaxLocations
	out.AvgLocations = metrics.AvgLocations

	// One page of companies.
	type companyActivityScan struct {
		CompanyID     int64
		CompanyToken  string
		Banned        bool
		DeviceCount   int64
		LocationCount int64
		FirstRecorded nullableTime
		LastRecorded  nullableTime
	}
	var scanned []companyActivityScan
	if err := db.WithContext(ctx).
		Table("companies").
		Select(`companies.id AS company_id,
			companies.company_token AS company_token,
			companies.banned AS banned,
			COUNT(locations.id) AS location_count,
			COUNT(DISTINCT locations.device_id) AS device_count,
			MIN(locations.recorded_at) AS first_recorded,
			MAX(locations.recorded_at) AS last_recorded`).
		Joins("LEFT JOIN locations ON locations.company_id = companies.id AND locations.recorded_at >= ?", cutoff).
		Group("companies.id, companies.company_token, companies.banned").
		Order(orderCol + " " + dir + ", companies.company_token ASC").
		Limit(perPage).
		Offset((page - 1) * perPage).
		Scan(&scanned).Error; err != nil {
		return nil, err
	}
	out.Companies = make([]CompanyActivity, 0, len(scanned))
	for _, s := range scanned {
		out.Companies = append(out.Companies, CompanyActivity{
			CompanyID:     s.CompanyID,
			CompanyToken:  s.CompanyToken,
			Banned:        s.Banned,
			DeviceCount:   s.DeviceCount,
			LocationCount: s.LocationCount,
			FirstRecorded: s.FirstRecorded.value,
			LastRecorded:  s.LastRecorded.value,
		})
	}
	return out, nil
}

// DeviceActivity captures one device's location count within a window.
type DeviceActivity struct {
	DeviceID      int64      `json:"id"`
	DeviceToken   string     `json:"device_id"`
	DeviceModel   string     `json:"device_model"`
	Framework     string     `json:"framework"`
	Version       string     `json:"version"`
	Banned        bool       `json:"banned"`
	LocationCount int64      `json:"location_count"`
	FirstRecorded *time.Time `json:"first_recorded"`
	LastRecorded  *time.Time `json:"last_recorded"`
}

// CompanyActivityDetail returns a single company's activity aggregate (or nil if the
// company does not exist) for the detail pane.
func CompanyActivityDetail(org string, window time.Duration) (*CompanyActivity, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	trimmed := strings.TrimSpace(org)
	if trimmed == "" {
		return nil, nil
	}
	if window <= 0 {
		window = 24 * time.Hour
	}
	cutoff := time.Now().UTC().Add(-window)
	type scan struct {
		CompanyID     int64
		CompanyToken  string
		Banned        bool
		DeviceCount   int64
		LocationCount int64
		FirstRecorded nullableTime
		LastRecorded  nullableTime
	}
	var row scan
	err = db.WithContext(context.Background()).
		Table("companies").
		Select(`companies.id AS company_id,
			companies.company_token AS company_token,
			companies.banned AS banned,
			COUNT(locations.id) AS location_count,
			COUNT(DISTINCT locations.device_id) AS device_count,
			MIN(locations.recorded_at) AS first_recorded,
			MAX(locations.recorded_at) AS last_recorded`).
		Joins("LEFT JOIN locations ON locations.company_id = companies.id AND locations.recorded_at >= ?", cutoff).
		Where("companies.company_token = ?", trimmed).
		Group("companies.id, companies.company_token, companies.banned").
		Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.CompanyID == 0 {
		return nil, nil
	}
	return &CompanyActivity{
		CompanyID:     row.CompanyID,
		CompanyToken:  row.CompanyToken,
		Banned:        row.Banned,
		DeviceCount:   row.DeviceCount,
		LocationCount: row.LocationCount,
		FirstRecorded: row.FirstRecorded.value,
		LastRecorded:  row.LastRecorded.value,
	}, nil
}

// RecentDeviceActivity returns per-device location counts for a company within
// the window (default 24h when window <= 0), ordered by location count descending.
func RecentDeviceActivity(companyID int64, window time.Duration) ([]DeviceActivity, error) {
	db, err := storage.DB()
	if err != nil {
		return nil, err
	}
	if window <= 0 {
		window = 24 * time.Hour
	}
	cutoff := time.Now().UTC().Add(-window)

	type deviceActivityScan struct {
		ID            int64
		DeviceID      string
		DeviceModel   string
		Framework     string
		Version       string
		Banned        bool
		LocationCount int64
		FirstRecorded nullableTime
		LastRecorded  nullableTime
	}
	var scanned []deviceActivityScan
	err = db.WithContext(context.Background()).
		Table("devices").
		Select(`devices.id AS id,
			devices.device_id AS device_id,
			devices.device_model AS device_model,
			devices.framework AS framework,
			devices.version AS version,
			devices.banned AS banned,
			COUNT(locations.id) AS location_count,
			MIN(locations.recorded_at) AS first_recorded,
			MAX(locations.recorded_at) AS last_recorded`).
		Joins("LEFT JOIN locations ON locations.device_id = devices.id AND locations.recorded_at >= ?", cutoff).
		Where("devices.company_id = ?", companyID).
		Group("devices.id, devices.device_id, devices.device_model, devices.framework, devices.version, devices.banned").
		Order("location_count DESC, devices.id ASC").
		Scan(&scanned).Error
	if err != nil {
		return nil, err
	}
	rows := make([]DeviceActivity, 0, len(scanned))
	for _, s := range scanned {
		rows = append(rows, DeviceActivity{
			DeviceID:      s.ID,
			DeviceToken:   s.DeviceID,
			DeviceModel:   s.DeviceModel,
			Framework:     s.Framework,
			Version:       s.Version,
			Banned:        s.Banned,
			LocationCount: s.LocationCount,
			FirstRecorded: s.FirstRecorded.value,
			LastRecorded:  s.LastRecorded.value,
		})
	}
	return rows, nil
}

// ThresholdViolation describes a company that exceeded a configured abuse threshold.
type ThresholdViolation struct {
	CompanyToken  string `json:"company_token"`
	LocationCount int64  `json:"location_count"`
	DeviceCount   int64  `json:"device_count"`
	Reason        string `json:"reason"`
}

// EvaluateThresholds returns the companies that exceed the configured per-window
// location or device thresholds. A threshold of 0 disables that check.
func EvaluateThresholds(cfg config.AbuseConfig) ([]ThresholdViolation, error) {
	window := time.Duration(cfg.WindowHours) * time.Hour
	if window <= 0 {
		window = 24 * time.Hour
	}
	summary, err := RecentActivity(window)
	if err != nil {
		return nil, err
	}
	var violations []ThresholdViolation
	for _, company := range summary.Companies {
		if company.Banned {
			continue
		}
		var reasons []string
		if cfg.MaxLocationsPerWindow > 0 && company.LocationCount > cfg.MaxLocationsPerWindow {
			reasons = append(reasons, "locations over limit")
		}
		if cfg.MaxDevicesPerWindow > 0 && company.DeviceCount > cfg.MaxDevicesPerWindow {
			reasons = append(reasons, "devices over limit")
		}
		if len(reasons) == 0 {
			continue
		}
		violations = append(violations, ThresholdViolation{
			CompanyToken:  company.CompanyToken,
			LocationCount: company.LocationCount,
			DeviceCount:   company.DeviceCount,
			Reason:        strings.Join(reasons, "; "),
		})
	}
	return violations, nil
}
