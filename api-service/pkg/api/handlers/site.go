package handlers

import (
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/middleware"
	"github.com/resistorsoftware/api-service/pkg/api/services"
)

type (
	publicJWTRequest struct {
		Org string `json:"org"`
	}
)

// SiteGetEnv exposes safe frontend-facing configuration bits.
func SiteGetEnv(c *gin.Context) {
	frontend, err := config.Frontend()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"GOOGLE_ANALYTICS_ID":   frontend.GoogleAnalyticsID,
		"GOOGLE_MAPS_API_KEY":   frontend.GoogleMapsAPIKey,
		"GOOGLE_TAG_ID":         frontend.GoogleTagID,
		"GOOGLE_TAG_MANAGER_ID": frontend.GoogleTagManagerID,
		"PURE_CHAT_ID":          frontend.PureChatID,
		"SHARED_DASHBOARD":      frontend.SharedDashboard,
	})
}

// SitePostJWT mints a dashboard-scoped JWT for the requested org.
func SitePostJWT(c *gin.Context) {
	var req publicJWTRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Org) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org is required"})
		return
	}

	token, err := issueDashboardToken(req.Org, false)
	if err != nil {
		if errors.Is(err, errReservedCompanyMissing) {
			c.JSON(http.StatusNotFound, gin.H{"message": err.Error(), "code": "ADMIN_ACCOUNT_REQUIRED"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"access_token": token, "org": req.Org, "token_type": "Bearer"})
}

// SiteGetCompanyTokens lists companies accessible to the caller.
func SiteGetCompanyTokens(c *gin.Context) {
	claims := middleware.Claims(c)
	targetOrg := strings.TrimSpace(c.DefaultQuery("company_token", claims.Org))
	if !middleware.IsAdmin(c) && !strings.EqualFold(targetOrg, claims.Org) {
		c.JSON(http.StatusForbidden, gin.H{"error": "scope mismatch"})
		return
	}

	records, err := services.ListCompanies(targetOrg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

// SiteGetDevices lists devices for the caller's organization/company.
func SiteGetDevices(c *gin.Context) {
	claims := middleware.Claims(c)
	companyID := parseIDPtr(c.Query("company_id"))
	if !middleware.IsAdmin(c) {
		if claims.CompanyID != 0 {
			companyID = &claims.CompanyID
		} else {
			companyID = nil
		}
	}

	devs, err := services.ListDevices(claims.Org, companyID, middleware.IsAdmin(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, devs)
}

// SiteDeleteDevice removes a device or selected history.
func SiteDeleteDevice(c *gin.Context) {
	claims := middleware.Claims(c)
	deviceID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || deviceID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device id"})
		return
	}
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
	companyID := parseIDPtr(c.Query("company_id"))
	if !middleware.IsAdmin(c) {
		if claims.CompanyID != 0 {
			companyID = &claims.CompanyID
		} else {
			companyID = nil
		}
	}

	if err := services.DeleteDeviceHistory(services.DeleteDeviceOptions{
		DeviceID:  deviceID,
		Org:       claims.Org,
		CompanyID: companyID,
		Start:     start,
		End:       end,
		Admin:     middleware.IsAdmin(c),
	}); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrNotFound) {
			status = http.StatusNotFound
		} else if errors.Is(err, services.ErrForbidden) {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// SiteGetLocations returns historical locations scoped by filters.
func SiteGetLocations(c *gin.Context) {
	claims := middleware.Claims(c)
	deviceID := parseIDPtr(c.Query("device_id"))
	companyID := parseIDPtr(c.Query("company_id"))
	if !middleware.IsAdmin(c) {
		if claims.CompanyID != 0 {
			companyID = &claims.CompanyID
		} else {
			companyID = nil
		}
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

	records, err := services.ListLocations(services.LocationFilters{
		Org:       claims.Org,
		CompanyID: companyID,
		DeviceID:  deviceID,
		Limit:     limit,
		Start:     start,
		End:       end,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

// SiteGetLatestLocation returns the most recent location for a device.
func SiteGetLatestLocation(c *gin.Context) {
	claims := middleware.Claims(c)
	deviceID := parseIDPtr(c.Query("device_id"))
	companyID := parseIDPtr(c.Query("company_id"))
	if !middleware.IsAdmin(c) {
		if claims.CompanyID != 0 {
			companyID = &claims.CompanyID
		} else {
			companyID = nil
		}
	}

	loc, err := services.LatestLocation(services.LocationFilters{
		Org:       claims.Org,
		CompanyID: companyID,
		DeviceID:  deviceID,
		Limit:     1,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if loc == nil {
		c.JSON(http.StatusOK, gin.H{})
		return
	}
	c.JSON(http.StatusOK, loc)
}

// errReservedCompanyMissing is returned when a dashboard token is requested for a
// reserved (_transistor*) org that has not been provisioned by an administrator.
// EnsureDashboardDevice would otherwise auto-create the company, which would defeat
// the reserved-prefix guard enforced on /api/register.
var errReservedCompanyMissing = errors.New("unknown _transistor account — an admin must create it first")

func issueDashboardToken(org string, admin bool) (string, error) {
	org = strings.TrimSpace(org)
	if org == "" {
		return "", errors.New("org required")
	}
	// Do not auto-provision reserved orgs through the dashboard token path; only
	// mint a token for a reserved org that an admin has already created.
	if services.IsProtectedCompanyToken(org) {
		exists, err := services.CompanyExists(org)
		if err != nil {
			return "", err
		}
		if !exists {
			return "", errReservedCompanyMissing
		}
	}
	companyID, deviceID, err := services.EnsureDashboardDevice(org)
	if err != nil {
		return "", err
	}
	claims := middleware.JWTClaims{
		CompanyID: companyID,
		DeviceID:  deviceID,
		Model:     "dashboard",
		Org:       org,
		UUID:      fmt.Sprintf("%s-dashboard", org),
		Admin:     admin,
	}
	signed, err := signClaims(claims)
	if err != nil {
		return "", err
	}
	return signed, nil
}

func signClaims(claims middleware.JWTClaims) (string, error) {
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	key, err := middleware.SigningKey()
	if err != nil {
		return "", err
	}
	return tk.SignedString(key)
}

func parseIDPtr(value string) *int64 {
	v := strings.TrimSpace(value)
	if v == "" {
		return nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n <= 0 {
		return nil
	}
	return &n
}

func parseIntOrDefault(value string, fallback int) int {
	if v, err := strconv.Atoi(strings.TrimSpace(value)); err == nil && v > 0 {
		return v
	}
	return fallback
}

func parseTimePtr(value string) (*time.Time, error) {
	v := strings.TrimSpace(value)
	if v == "" {
		return nil, nil
	}
	layouts := []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04", "2006-01-02"}
	for _, layout := range layouts {
		if ts, err := time.Parse(layout, v); err == nil {
			t := ts.UTC()
			return &t, nil
		}
	}
	return nil, fmt.Errorf("parse time %q", value)
}

// Helpers reused from legacy handlers to keep parity.
func hashRefreshToken(token string) string {
	sum := md5.Sum([]byte(token))
	return hex.EncodeToString(sum[:])
}

// SignJWTForDevice is shared with the mobile handlers to avoid duplication.
func SignJWTForDevice(claims middleware.JWTClaims) (string, string, error) {
	token, err := signClaims(claims)
	if err != nil {
		return "", "", err
	}
	return token, hashRefreshToken(token), nil
}

// IssueRegistrationToken wires registration + JWT issuing for APIRegister reuse.
func IssueRegistrationToken(companyID, deviceID int64, org, model, uuid string) (string, string, error) {
	claims := middleware.JWTClaims{CompanyID: companyID, DeviceID: deviceID, Model: model, Org: org, UUID: uuid}
	return SignJWTForDevice(claims)
}
