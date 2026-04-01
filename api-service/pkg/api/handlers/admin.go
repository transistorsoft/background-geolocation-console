//go:build admin || heroku_admin

package handlers

import (
	"crypto/subtle"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/middleware"
	"github.com/resistorsoftware/api-service/pkg/api/services"
)

type adminLoginPageData struct {
	CSRFToken string
	Error     string
	Username  string
}

type adminLink struct {
	Label string
	URL   string
}

type adminOrgLink struct {
	CompanyToken string
	URL          string
	Active       bool
}

type adminDeviceRow struct {
	ID           int64
	DisplayName  string
	DeviceID     string
	Model        string
	Framework    string
	UpdatedAt    string
	InspectURL   string
	DashboardURL string
	DeleteURL    string
	Selected     bool
}

type adminSelectedDeviceView struct {
	DisplayName       string
	DeviceID          string
	LatestRecordedAt  string
	LatestCoordinates string
	LatestURL         string
	HistoryURL        string
}

type adminHomePageData struct {
	Username             string
	ExpiresAt            string
	CSRFToken            string
	Message              string
	CompanyCount         int
	SelectedOrg          string
	SelectedOrgRaw       string
	DeviceCount          int
	SelectedDevicePoints int64
	Organizations        []adminOrgLink
	DataLinks            []adminLink
	Devices              []adminDeviceRow
	SelectedDevice       *adminSelectedDeviceView
	ShowEmptyOrgMessage  bool
}

// AdminLoginPage renders the admin login form.
func AdminLoginPage(c *gin.Context) {
	if _, err := middleware.AdminSessionFromRequest(c); err == nil {
		c.Redirect(http.StatusFound, "/admin")
		return
	}
	renderAdminLogin(c, "", "")
}

// AdminLogin authenticates the bootstrap admin credential and starts a session.
func AdminLogin(c *gin.Context) {
	adminCfg, err := config.Admin()
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	if !strings.EqualFold(adminCfg.LoginMode, "password") {
		c.String(http.StatusNotImplemented, "admin login mode not implemented")
		return
	}
	username := strings.TrimSpace(c.PostForm("username"))
	password := c.PostForm("password")
	if !validAdminCredentials(adminCfg.BootstrapUsername, adminCfg.BootstrapPassword, username, password) {
		renderAdminLogin(c, "Invalid credentials", username)
		return
	}
	ttl := time.Duration(adminCfg.SessionTTLMinutes) * time.Minute
	claims := middleware.NewAdminClaims(adminCfg.BootstrapUsername, ttl)
	signed, err := middleware.SignAdminToken(claims)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	middleware.SetAdminSessionCookie(c, signed, ttl)
	if _, err := middleware.IssueAdminCSRFCookie(c); err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	c.Redirect(http.StatusFound, "/admin")
}

// AdminLogout clears the current admin session.
func AdminLogout(c *gin.Context) {
	middleware.ClearAdminSessionCookie(c)
	middleware.ClearAdminCSRFCookie(c)
	c.Redirect(http.StatusFound, "/admin/login")
}

// AdminHome renders the authenticated admin landing page.
func AdminHome(c *gin.Context) {
	claims := middleware.CurrentAdmin(c)
	csrfToken, err := middleware.EnsureAdminCSRFCookie(c)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	selectedOrg := strings.TrimSpace(c.Query("org"))
	selectedDeviceID := parseIDPtr(c.Query("device_id"))
	message := strings.TrimSpace(c.Query("message"))
	companies, err := services.ListCompanies("")
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	var devices []services.DeviceDetails
	if selectedOrg != "" {
		devices, err = services.ListDevices(selectedOrg, nil, true)
		if err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
	}
	selectedDevice := pickAdminDevice(devices, selectedDeviceID)
	var latestLocation map[string]any
	var locationCount int64
	if selectedOrg != "" && selectedDevice != nil {
		locationCount, err = services.CountLocations(services.LocationFilters{Org: selectedOrg, DeviceID: &selectedDevice.ID})
		if err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		latestLocation, err = services.LatestLocation(services.LocationFilters{Org: selectedOrg, DeviceID: &selectedDevice.ID, Limit: 1})
		if err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
	}
	expires := ""
	if claims.ExpiresAt != nil {
		expires = claims.ExpiresAt.Time.UTC().Format(time.RFC3339)
	}
	renderAdminTemplate(c, "admin-home", buildAdminHomePageData(claims.Username, expires, csrfToken, message, selectedOrg, companies, devices, selectedDevice, locationCount, latestLocation))
}

// AdminSession returns the current admin session payload.
func AdminSession(c *gin.Context) {
	claims := middleware.CurrentAdmin(c)
	c.JSON(http.StatusOK, gin.H{
		"username":   claims.Username,
		"admin":      claims.Admin,
		"role":       claims.Role,
		"expires_at": claims.ExpiresAt,
	})
}

// AdminGetCompanies lists companies for an org under an authenticated admin session.
func AdminGetCompanies(c *gin.Context) {
	org := strings.TrimSpace(c.Query("org"))
	records, err := services.ListCompanies(org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

// AdminGetDevices lists devices for an org and optional company id.
func AdminGetDevices(c *gin.Context) {
	org := strings.TrimSpace(c.Query("org"))
	companyID := parseIDPtr(c.Query("company_id"))
	devs, err := services.ListDevices(org, companyID, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, devs)
}

// AdminGetLocations lists historical locations under authenticated admin scope.
func AdminGetLocations(c *gin.Context) {
	deviceID := parseIDPtr(c.Query("device_id"))
	companyID := parseIDPtr(c.Query("company_id"))
	if deviceID == nil && companyID == nil && strings.TrimSpace(c.Query("org")) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org, company_id, or device_id is required"})
		return
	}
	limit := parseIntOrDefault(c.Query("limit"), 250)
	start, err := parseTimePtr(c.Query("start_date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date"})
		return
	}
	end, err := parseTimePtr(c.Query("end_date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date"})
		return
	}
	records, err := services.ListLocations(services.LocationFilters{Org: strings.TrimSpace(c.Query("org")), CompanyID: companyID, DeviceID: deviceID, Limit: limit, Start: start, End: end})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

// AdminGetLatestLocation returns the latest location under authenticated admin scope.
func AdminGetLatestLocation(c *gin.Context) {
	deviceID := parseIDPtr(c.Query("device_id"))
	companyID := parseIDPtr(c.Query("company_id"))
	if deviceID == nil && companyID == nil && strings.TrimSpace(c.Query("org")) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org, company_id, or device_id is required"})
		return
	}
	record, err := services.LatestLocation(services.LocationFilters{Org: strings.TrimSpace(c.Query("org")), CompanyID: companyID, DeviceID: deviceID, Limit: 1})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if record == nil {
		c.JSON(http.StatusOK, gin.H{})
		return
	}
	c.JSON(http.StatusOK, record)
}

// AdminDeleteDevice removes a device under authenticated admin scope.
func AdminDeleteDevice(c *gin.Context) {
	deviceID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || deviceID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device id"})
		return
	}
	org := strings.TrimSpace(c.Query("org"))
	if org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org is required"})
		return
	}
	if err := services.DeleteDeviceHistory(services.DeleteDeviceOptions{DeviceID: deviceID, Org: org, Admin: true}); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	log.Printf("admin delete device: user=%s org=%s device_id=%d", middleware.CurrentAdmin(c).Username, org, deviceID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdminDeleteDevicePost removes a device and redirects back to the admin console.
func AdminDeleteDevicePost(c *gin.Context) {
	deviceID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || deviceID <= 0 {
		c.Redirect(http.StatusFound, "/admin?message=invalid+device+id")
		return
	}
	org := strings.TrimSpace(c.PostForm("org"))
	if org == "" {
		org = strings.TrimSpace(c.Query("org"))
	}
	if org == "" {
		c.Redirect(http.StatusFound, "/admin?message=org+is+required")
		return
	}
	if strings.TrimSpace(strings.ToLower(c.PostForm("confirm"))) != "delete" {
		c.Redirect(http.StatusFound, "/admin?org="+adminQueryEscape(org)+"&message=type+delete+to+confirm")
		return
	}
	if err := services.DeleteDeviceHistory(services.DeleteDeviceOptions{DeviceID: deviceID, Org: org, Admin: true}); err != nil {
		c.Redirect(http.StatusFound, "/admin?org="+adminQueryEscape(org)+"&message="+adminQueryEscape(err.Error()))
		return
	}
	log.Printf("admin delete device: user=%s org=%s device_id=%d", middleware.CurrentAdmin(c).Username, org, deviceID)
	c.Redirect(http.StatusFound, "/admin?org="+adminQueryEscape(org)+"&message=device+deleted")
}

func renderAdminLogin(c *gin.Context, errMsg, username string) {
	csrfToken, err := middleware.EnsureAdminCSRFCookie(c)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}
	renderAdminTemplate(c, "admin-login", adminLoginPageData{CSRFToken: csrfToken, Error: errMsg, Username: username})
}

func validAdminCredentials(expectedUsername, expectedPassword, username, password string) bool {
	if strings.TrimSpace(expectedUsername) == "" || expectedPassword == "" {
		return false
	}
	usernameOK := subtle.ConstantTimeCompare([]byte(strings.TrimSpace(expectedUsername)), []byte(strings.TrimSpace(username))) == 1
	passwordOK := subtle.ConstantTimeCompare([]byte(expectedPassword), []byte(password)) == 1
	return usernameOK && passwordOK
}

func buildAdminHomePageData(username, expires, csrfToken, message, selectedOrg string, companies []services.CompanySummary, devices []services.DeviceDetails, selectedDevice *services.DeviceDetails, locationCount int64, latestLocation map[string]any) adminHomePageData {
	data := adminHomePageData{
		Username:             username,
		ExpiresAt:            expires,
		CSRFToken:            csrfToken,
		Message:              message,
		CompanyCount:         len(companies),
		SelectedOrg:          adminValueOrFallback(selectedOrg, "none"),
		SelectedOrgRaw:       selectedOrg,
		DeviceCount:          len(devices),
		SelectedDevicePoints: locationCount,
		ShowEmptyOrgMessage:  strings.TrimSpace(selectedOrg) == "",
	}
	for _, company := range companies {
		data.Organizations = append(data.Organizations, adminOrgLink{CompanyToken: company.CompanyToken, URL: "/admin?org=" + adminQueryEscape(company.CompanyToken), Active: strings.EqualFold(company.CompanyToken, selectedOrg)})
	}
	data.DataLinks = append(data.DataLinks, adminLink{Label: "All companies JSON", URL: "/admin/api/companies"})
	if strings.TrimSpace(selectedOrg) != "" {
		data.DataLinks = append(data.DataLinks,
			adminLink{Label: "Devices JSON", URL: "/admin/api/devices?org=" + adminQueryEscape(selectedOrg)},
			adminLink{Label: "Public dashboard", URL: "/dashboard/" + adminPathEscape(selectedOrg)},
		)
	}
	for _, device := range devices {
		data.Devices = append(data.Devices, adminDeviceRow{
			ID:           device.ID,
			DisplayName:  device.DisplayName(),
			DeviceID:     device.DeviceID,
			Model:        adminValueOrFallback(device.DeviceModel, "-"),
			Framework:    adminValueOrFallback(device.Framework, "-"),
			UpdatedAt:    adminTimeValue(device.UpdatedAt),
			InspectURL:   "/admin?org=" + adminQueryEscape(selectedOrg) + "&device_id=" + strconv.FormatInt(device.ID, 10),
			DashboardURL: "/dashboard/" + adminPathEscape(selectedOrg) + "?device_id=" + strconv.FormatInt(device.ID, 10),
			DeleteURL:    "/admin/devices/" + strconv.FormatInt(device.ID, 10) + "/delete",
			Selected:     selectedDevice != nil && selectedDevice.ID == device.ID,
		})
	}
	if selectedDevice != nil {
		view := &adminSelectedDeviceView{
			DisplayName: selectedDevice.DisplayName(),
			DeviceID:    selectedDevice.DeviceID,
			LatestURL:   "/admin/api/locations/latest?org=" + adminQueryEscape(selectedOrg) + "&device_id=" + strconv.FormatInt(selectedDevice.ID, 10),
			HistoryURL:  "/admin/api/locations?org=" + adminQueryEscape(selectedOrg) + "&device_id=" + strconv.FormatInt(selectedDevice.ID, 10),
		}
		if latestLocation != nil {
			view.LatestRecordedAt = adminValueOrFallback(adminAnyString(latestLocation["recorded_at"]), "unknown")
			view.LatestCoordinates = adminCoordinates(latestLocation)
		}
		data.SelectedDevice = view
		data.DataLinks = append(data.DataLinks,
			adminLink{Label: "Latest location JSON", URL: view.LatestURL},
			adminLink{Label: "Locations JSON", URL: view.HistoryURL},
		)
	}
	return data
}

func pickAdminDevice(devices []services.DeviceDetails, selectedDeviceID *int64) *services.DeviceDetails {
	if selectedDeviceID == nil {
		return nil
	}
	for i := range devices {
		if devices[i].ID == *selectedDeviceID {
			return &devices[i]
		}
	}
	return nil
}

func adminTimeValue(ts *time.Time) string {
	if ts == nil {
		return "-"
	}
	return ts.UTC().Format(time.RFC3339)
}

func adminValueOrFallback(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func adminQueryEscape(value string) string {
	return url.QueryEscape(value)
}

func adminPathEscape(value string) string {
	return url.PathEscape(value)
}

func adminAnyString(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case fmt.Stringer:
		return v.String()
	default:
		return fmt.Sprintf("%v", v)
	}
}

func adminCoordinates(payload map[string]any) string {
	if payload == nil {
		return "unknown"
	}
	lat := adminAnyString(payload["latitude"])
	lng := adminAnyString(payload["longitude"])
	if lat == "<nil>" || lng == "<nil>" || strings.TrimSpace(lat) == "" || strings.TrimSpace(lng) == "" {
		return "unknown"
	}
	return lat + ", " + lng
}
