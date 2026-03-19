package web

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/services"
)

//go:embed templates/*.html templates/partials/*.html
var templateFS embed.FS

//go:embed assets/*
var assetFS embed.FS

// Server renders the dashboard UI using Go templates.
type Server struct {
	tmpl      *template.Template
	assetFS   fs.FS
	htmxPoll  time.Duration
	pageLimit int
	mapsKey   string
}

// NewServer parses embedded templates/assets and returns a Server.
func NewServer() (*Server, error) {
	funcs := template.FuncMap{
		"formatTime": formatTime,
		"formatBool": formatBool,
		"shortUUID":  shortUUID,
	}
	tmpl, err := template.New("base").Funcs(funcs).ParseFS(templateFS, "templates/*.html", "templates/partials/*.html")
	if err != nil {
		return nil, err
	}
	sub, err := fs.Sub(assetFS, "assets")
	if err != nil {
		return nil, err
	}
	var mapsKey string
	if frontend, err := config.Frontend(); err == nil {
		mapsKey = strings.TrimSpace(frontend.GoogleMapsAPIKey)
	}

	return &Server{
		tmpl:      tmpl,
		assetFS:   sub,
		htmxPoll:  10 * time.Second,
		pageLimit: 250,
		mapsKey:   mapsKey,
	}, nil
}

// Register wires dashboard routes and assets onto the supplied Gin engine.
func (s *Server) Register(r *gin.Engine) {
	r.GET("/", s.handleDashboard)
	r.GET("/dashboard", s.handleDashboard)
	r.GET("/dashboard/:org", s.handleDashboard)
	r.GET("/dashboard/:org/partials/locations", s.handleLocationsPartial)
	r.GET("/dashboard/:org/timeline", s.handleTimeline)
	r.GET("/dashboard/:org/latest", s.handleLatestLocation)
	r.GET("/dashboard/:org/session/latest", s.handleLatestSessionRange)
	r.GET("/dashboard/:org/range", s.handleLocationRange)
	r.StaticFS("/dashboard/assets", http.FS(s.assetFS))
	r.NoRoute(s.handleFallback)
}

func (s *Server) handleDashboard(c *gin.Context) {
	org := strings.TrimSpace(c.Param("org"))
	if org == "" {
		org = strings.TrimSpace(c.Query("org"))
	}
	q := c.Request.URL.Query()
	data, err := s.buildDashboardData(org, q)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_, _ = c.Writer.Write([]byte(err.Error()))
		return
	}
	data.PollEvery = s.htmxPoll
	data.PartialLocationsURL = s.locationsURL(org, data.SelectedCompanyID, data.SelectedDeviceID, data.From, data.To, data.WatchMode)
	if err := s.tmpl.ExecuteTemplate(c.Writer, "dashboard", data); err != nil {
		c.Status(http.StatusInternalServerError)
		_, _ = c.Writer.Write([]byte(err.Error()))
		return
	}
}

func (s *Server) handleLocationsPartial(c *gin.Context) {
	org := strings.TrimSpace(c.Param("org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org required"})
		return
	}
	data, err := s.buildDashboardData(org, c.Request.URL.Query())
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_, _ = c.Writer.Write([]byte(err.Error()))
		return
	}
	if err := s.tmpl.ExecuteTemplate(c.Writer, "partials/locations", data); err != nil {
		c.Status(http.StatusInternalServerError)
		_, _ = c.Writer.Write([]byte(err.Error()))
		return
	}
}

func (s *Server) handleTimeline(c *gin.Context) {
	org := strings.TrimSpace(c.Param("org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org required"})
		return
	}
	params := c.Request.URL.Query()
	companyID := parseID(firstParam(params, "company_id", ""))
	deviceID := parseID(firstParam(params, "device_id", ""))
	filters := services.LocationFilters{Org: org}
	if companyID != 0 {
		filters.CompanyID = int64Ptr(companyID)
	}
	if deviceID != 0 {
		filters.DeviceID = int64Ptr(deviceID)
	}
	if from := parseTime(firstParam(params, "start_date", "")); from != nil {
		filters.Start = from
	}
	if to := parseTime(firstParam(params, "end_date", "")); to != nil {
		filters.End = to
	}

	timeline, err := services.BuildLocationTimeline(filters, 30*time.Minute)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_, _ = c.Writer.Write([]byte(err.Error()))
		return
	}

	type timelineSessionResponse struct {
		Start          string `json:"start"`
		End            string `json:"end"`
		Count          int    `json:"count"`
		DurationMinute int64  `json:"duration_minutes"`
	}
	resp := gin.H{
		"start":         "",
		"end":           "",
		"total_points":  0,
		"session_count": 0,
		"sessions":      []timelineSessionResponse{},
	}
	if timeline == nil {
		c.JSON(http.StatusOK, resp)
		return
	}
	resp["total_points"] = timeline.TotalCount
	resp["session_count"] = len(timeline.Sessions)
	if timeline.Start != nil {
		resp["start"] = timeline.Start.UTC().Format(time.RFC3339Nano)
	}
	if timeline.End != nil {
		resp["end"] = timeline.End.UTC().Format(time.RFC3339Nano)
	}
	sessions := make([]timelineSessionResponse, 0, len(timeline.Sessions))
	for _, session := range timeline.Sessions {
		duration := session.End.Sub(session.Start)
		if duration < 0 {
			duration = 0
		}
		sessions = append(sessions, timelineSessionResponse{
			Start:          session.Start.UTC().Format(time.RFC3339Nano),
			End:            session.End.UTC().Format(time.RFC3339Nano),
			Count:          session.Count,
			DurationMinute: int64(duration / time.Minute),
		})
	}
	resp["sessions"] = sessions
	c.JSON(http.StatusOK, resp)
}

func (s *Server) handleLatestLocation(c *gin.Context) {
	org := strings.TrimSpace(c.Param("org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org required"})
		return
	}
	params := c.Request.URL.Query()
	companyID := parseID(firstParam(params, "company_id", ""))
	deviceID := parseID(firstParam(params, "device_id", ""))
	filters := services.LocationFilters{Org: org}
	if companyID != 0 {
		filters.CompanyID = int64Ptr(companyID)
	}
	if deviceID != 0 {
		filters.DeviceID = int64Ptr(deviceID)
	}
	latest, err := services.LatestLocation(filters)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_, _ = c.Writer.Write([]byte(err.Error()))
		return
	}
	if latest == nil {
		c.JSON(http.StatusOK, gin.H{"recorded_at": ""})
		return
	}
	recorded := stringFromAny(latest["recorded_at"])
	if recorded == "" {
		recorded = stringFromAny(latest["timestamp"])
	}
	c.JSON(http.StatusOK, gin.H{"recorded_at": recorded})
}

func (s *Server) handleLocationRange(c *gin.Context) {
	org := strings.TrimSpace(c.Param("org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org required"})
		return
	}
	params := c.Request.URL.Query()
	companyID := parseID(firstParam(params, "company_id", ""))
	deviceID := parseID(firstParam(params, "device_id", ""))
	filters := services.LocationFilters{Org: org}
	if companyID != 0 {
		filters.CompanyID = int64Ptr(companyID)
	}
	if deviceID != 0 {
		filters.DeviceID = int64Ptr(deviceID)
	}
	start, end, err := services.LocationRange(filters)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_, _ = c.Writer.Write([]byte(err.Error()))
		return
	}
	resp := gin.H{"start": "", "end": ""}
	if start != nil {
		resp["start"] = start.UTC().Format(time.RFC3339Nano)
	}
	if end != nil {
		resp["end"] = end.UTC().Format(time.RFC3339Nano)
	}
	c.JSON(http.StatusOK, resp)
}

func (s *Server) handleLatestSessionRange(c *gin.Context) {
	org := strings.TrimSpace(c.Param("org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org required"})
		return
	}
	params := c.Request.URL.Query()
	companyID := parseID(firstParam(params, "company_id", ""))
	deviceID := parseID(firstParam(params, "device_id", ""))
	filters := services.LocationFilters{Org: org}
	if companyID != 0 {
		filters.CompanyID = int64Ptr(companyID)
	}
	if deviceID != 0 {
		filters.DeviceID = int64Ptr(deviceID)
	} else {
		c.JSON(http.StatusOK, gin.H{"start": "", "end": "", "count": 0})
		return
	}
	session, err := services.LatestSessionRange(filters, 30*time.Minute)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		_, _ = c.Writer.Write([]byte(err.Error()))
		return
	}
	resp := gin.H{"start": "", "end": "", "count": 0}
	if session != nil {
		if session.Start != nil {
			resp["start"] = session.Start.UTC().Format(time.RFC3339Nano)
		}
		if session.End != nil {
			resp["end"] = session.End.UTC().Format(time.RFC3339Nano)
		}
		resp["count"] = session.Count
	}
	c.JSON(http.StatusOK, resp)
}

func (s *Server) handleFallback(c *gin.Context) {
	if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if strings.HasPrefix(c.Request.URL.Path, "/api/") {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	trimmed := strings.Trim(c.Request.URL.Path, "/")
	if trimmed == "" || trimmed == "dashboard" {
		s.handleDashboard(c)
		return
	}
	segments := strings.Split(trimmed, "/")
	if len(segments) == 1 {
		c.Params = append(c.Params, gin.Param{Key: "org", Value: segments[0]})
		s.handleDashboard(c)
		return
	}
	if len(segments) == 3 && segments[1] == "partials" && segments[2] == "locations" {
		c.Params = append(c.Params, gin.Param{Key: "org", Value: segments[0]})
		s.handleLocationsPartial(c)
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
}

func (s *Server) buildDashboardData(org string, params map[string][]string) (*DashboardPage, error) {
	data := &DashboardPage{
		Org:              org,
		From:             firstParam(params, "start_date", ""),
		To:               firstParam(params, "end_date", ""),
		WatchMode:        strings.ToLower(firstParam(params, "watch_mode", "")) == "true",
		MapLocationsJSON: template.JS("[]"),
		PollEvery:        s.htmxPoll,
	}
	data.GoogleMapsKey = s.mapsKey
	data.HasMap = strings.TrimSpace(s.mapsKey) != ""
	if strings.TrimSpace(org) == "" {
		return data, nil
	}
	companies, err := services.ListCompanies(org)
	if err != nil {
		return nil, err
	}
	data.Companies = companies
	companyID := chooseID(firstParam(params, "company_id", ""), companies)
	data.SelectedCompanyID = companyID

	var companyPtr *int64
	if companyID != 0 {
		companyPtr = int64Ptr(companyID)
	}
	devices, err := services.ListDevices(org, companyPtr, true)
	if err != nil {
		return nil, err
	}
	data.Devices = devices
	deviceID := chooseDeviceID(firstParam(params, "device_id", ""), devices)
	data.SelectedDeviceID = deviceID
	data.HasSelectedDevice = deviceID != 0

	var devicePtr *int64
	if deviceID != 0 {
		devicePtr = int64Ptr(deviceID)
	}
	filters := services.LocationFilters{
		Org:       org,
		CompanyID: companyPtr,
		DeviceID:  devicePtr,
		Limit:     s.pageLimit,
	}
	if from := parseTime(data.From); from != nil {
		filters.Start = from
	}
	if to := parseTime(data.To); to != nil {
		filters.End = to
	}
	data.HasActiveFilters = data.HasSelectedDevice && (filters.Start != nil || filters.End != nil)
	if data.WatchMode && data.HasSelectedDevice {
		filters.Limit = 1
		latest, err := services.LatestLocation(filters)
		if err != nil {
			return nil, err
		}
		if latest != nil {
			data.Locations = buildLocationViews([]map[string]any{latest})
			if payload, err := json.Marshal([]map[string]any{latest}); err == nil {
				data.MapLocationsJSON = template.JS(payload)
			}
		}
	} else if data.HasActiveFilters {
		records, err := services.ListLocations(filters)
		if err != nil {
			return nil, err
		}
		data.Locations = buildLocationViews(records)
		if payload, err := json.Marshal(records); err == nil {
			data.MapLocationsJSON = template.JS(payload)
		} else {
			data.MapLocationsJSON = template.JS("[]")
		}
	}
	if data.HasSelectedDevice && (data.HasActiveFilters || data.WatchMode) {
		if count, err := services.CountLocations(filters); err == nil {
			data.TotalLocations = count
		} else {
			data.TotalLocations = int64(len(data.Locations))
		}
	} else {
		data.TotalLocations = 0
	}
	if len(data.Locations) > 0 {
		data.VisibleRangeEnd = formatDateOnly(data.Locations[0].RecordedAtISO)
		data.VisibleRangeStart = formatDateOnly(data.Locations[len(data.Locations)-1].RecordedAtISO)
	}
	return data, nil
}

func (s *Server) locationsURL(org string, companyID, deviceID int64, from, to string, watch bool) string {
	if strings.TrimSpace(org) == "" {
		return "/dashboard"
	}
	var params []string
	if companyID != 0 {
		params = append(params, fmt.Sprintf("company_id=%d", companyID))
	}
	if deviceID != 0 {
		params = append(params, fmt.Sprintf("device_id=%d", deviceID))
	}
	query := ""
	if len(params) > 0 {
		query = "?" + strings.Join(params, "&")
	}
	return path.Clean(fmt.Sprintf("/dashboard/%s/partials/locations%s", org, query))
}

// DashboardPage holds all data needed to render the dashboard template.
type DashboardPage struct {
	Org                 string
	Companies           []services.CompanySummary
	Devices             []services.DeviceDetails
	SelectedCompanyID   int64
	SelectedDeviceID    int64
	HasSelectedDevice   bool
	Locations           []LocationView
	PollEvery           time.Duration
	PartialLocationsURL string
	From                string
	To                  string
	WatchMode           bool
	HasActiveFilters    bool
	MapLocationsJSON    template.JS
	GoogleMapsKey       string
	HasMap              bool
	TotalLocations      int64
	VisibleRangeStart   string
	VisibleRangeEnd     string
}

// LocationView is a template-friendly representation of a location row.
type LocationView struct {
	ID              string
	UUID            string
	RecordedAt      string
	RecordedAtISO   string
	RecordedDateUTC string
	RecordedTimeUTC string
	CreatedAt       string
	Coordinate      string
	Accuracy        string
	Speed           string
	Event           string
	IsMoving        bool
	Activity        string
	ActivityDetails string
	Battery         string
	BatteryCharging bool
	RawJSON         string
}

func buildLocationViews(records []map[string]any) []LocationView {
	out := make([]LocationView, 0, len(records))
	for _, rec := range records {
		lat, latOK := floatFromAny(rec["latitude"])
		lng, lngOK := floatFromAny(rec["longitude"])
		coord := ""
		if latOK && lngOK {
			coord = fmt.Sprintf("%.2f, %.2f", lat, lng)
		}
		acc := formatMetric(rec["accuracy"], "m")
		speed := formatMetric(rec["speed"], "m/s")
		activity := strings.TrimSpace(stringFromAny(rec["activity_type"]))
		if activity == "" {
			activity = "unknown"
		}
		activityDetails := fmt.Sprintf("%s (%s)", activity, stringFromAny(rec["activity_confidence"]))
		battery := formatBattery(rec["battery_level"])
		recordedISO := stringFromAny(rec["recorded_at"])
		recordedDate, recordedTime := formatUTCParts(recordedISO)
		rawJSON := "{}"
		if payload, err := json.MarshalIndent(rec, "", "  "); err == nil {
			rawJSON = string(payload)
		}
		view := LocationView{
			ID:              stringFromAny(rec["id"]),
			UUID:            stringFromAny(rec["uuid"]),
			RecordedAt:      formatTime(recordedISO),
			RecordedAtISO:   recordedISO,
			RecordedDateUTC: recordedDate,
			RecordedTimeUTC: recordedTime,
			CreatedAt:       formatTime(stringFromAny(rec["created_at"])),
			Coordinate:      coord,
			Accuracy:        acc,
			Speed:           speed,
			Event:           stringFromAny(rec["event"]),
			IsMoving:        boolFromAny(rec["is_moving"]),
			Activity:        activity,
			ActivityDetails: activityDetails,
			Battery:         battery,
			BatteryCharging: boolFromAny(rec["battery_is_charging"]),
			RawJSON:         rawJSON,
		}
		out = append(out, view)
	}
	return out
}

func chooseID(param string, companies []services.CompanySummary) int64 {
	if id := parseID(param); id != 0 {
		return id
	}
	if len(companies) > 0 {
		return companies[0].ID
	}
	return 0
}

func chooseDeviceID(param string, devices []services.DeviceDetails) int64 {
	if id := parseID(param); id != 0 {
		return id
	}
	if len(devices) == 1 {
		return devices[0].ID
	}
	return 0
}

func parseID(value string) int64 {
	if strings.TrimSpace(value) == "" {
		return 0
	}
	n, err := strconv.ParseInt(value, 10, 64)
	if err != nil || n <= 0 {
		return 0
	}
	return n
}

func int64Ptr(v int64) *int64 {
	return &v
}

func floatFromAny(val any) (float64, bool) {
	switch v := val.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		if err == nil {
			return f, true
		}
	}
	return 0, false
}

func stringFromAny(val any) string {
	switch v := val.(type) {
	case string:
		return strings.TrimSpace(v)
	case fmt.Stringer:
		return v.String()
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	}
	return ""
}

func boolFromAny(val any) bool {
	switch v := val.(type) {
	case bool:
		return v
	case string:
		lowered := strings.ToLower(strings.TrimSpace(v))
		return lowered == "true" || lowered == "1" || lowered == "yes"
	case int:
		return v != 0
	case int64:
		return v != 0
	}
	return false
}

func formatMetric(val any, suffix string) string {
	if f, ok := floatFromAny(val); ok {
		return fmt.Sprintf("%.2f %s", f, suffix)
	}
	return ""
}

func formatBattery(val any) string {
	if f, ok := floatFromAny(val); ok {
		if f < 0 {
			return "unknown"
		}
		if f > 1 {
			f = f / 100
		}
		return fmt.Sprintf("%.0f%%", f*100)
	}
	return ""
}

func formatTime(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	if ts, err := time.Parse(time.RFC3339Nano, value); err == nil {
		return ts.UTC().Format(time.RFC1123)
	}
	return value
}

func formatDateOnly(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	if ts, err := time.Parse(time.RFC3339Nano, value); err == nil {
		return ts.UTC().Format("2006-01-02")
	}
	return value
}

func formatBool(v bool) string {
	if v {
		return "Yes"
	}
	return "No"
}

func parseTime(value string) *time.Time {
	val := strings.TrimSpace(value)
	if val == "" {
		return nil
	}
	layouts := []string{time.RFC3339Nano, time.RFC3339}
	for _, layout := range layouts {
		if ts, err := time.Parse(layout, val); err == nil {
			t := ts.UTC()
			return &t
		}
	}
	localLayouts := []string{"2006-01-02T15:04", "2006-01-02"}
	for _, layout := range localLayouts {
		if ts, err := time.ParseInLocation(layout, val, time.UTC); err == nil {
			t := ts.UTC()
			return &t
		}
	}
	return nil
}

func formatDateTimeInputUTC(ts time.Time) string {
	return ts.UTC().Format("2006-01-02T15:04")
}

func startOfUTCDay(ts time.Time) time.Time {
	return time.Date(ts.UTC().Year(), ts.UTC().Month(), ts.UTC().Day(), 0, 0, 0, 0, time.UTC)
}

func firstParam(values map[string][]string, key, fallback string) string {
	if values == nil {
		return fallback
	}
	if v, ok := values[key]; ok && len(v) > 0 {
		trimmed := strings.TrimSpace(v[0])
		if trimmed != "" {
			return trimmed
		}
	}
	return fallback
}

func defaultFrom() string {
	return ""
}

func defaultTo() string {
	return ""
}

func shortUUID(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	parts := strings.SplitN(trimmed, "-", 2)
	return parts[0]
}

func formatUTCParts(value string) (string, string) {
	if strings.TrimSpace(value) == "" {
		return "", ""
	}
	ts, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return value, ""
	}
	date := ts.UTC().Format("Mon, Jan 02 2006")
	timePart := ts.UTC().Format("15:04:05 UTC")
	return date, timePart
}
