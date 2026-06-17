package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/middleware"
	"github.com/resistorsoftware/api-service/pkg/api/services"
	"github.com/resistorsoftware/api-service/pkg/api/types"
)

// APIRegister mirrors the Flutter sample's register call and issues a JWT.
func APIRegister(c *gin.Context) {
	var req types.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Org == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Organization identifier empty"})
		return
	}
	if req.UUID == "" || (req.Model == "" && req.DeviceModel == "") || req.Manufacturer == "" || req.Version == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Device info is missing"})
		return
	}

	// The _transistor prefix is reserved for administrator-created companies.
	if services.IsProtectedCompanyToken(req.Org) {
		c.JSON(http.StatusForbidden, gin.H{"message": "reserved company token"})
		return
	}
	// Reject banned or denylisted companies before provisioning anything.
	if banned, err := services.CompanyBanned(req.Org); err == nil && banned {
		writeBannedStop(c)
		return
	}
	if services.IsDeniedCompany(req.Org) {
		writeBannedStop(c)
		return
	}

	companyID, deviceID, err := services.FindOrCreateDevice(req.Org, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	model := strings.TrimSpace(req.Model)
	if model == "" {
		model = strings.TrimSpace(req.DeviceModel)
	}
	token, refresh, err := IssueRegistrationToken(companyID, deviceID, req.Org, model, req.UUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"accessToken": token, "expires": -1, "refreshToken": refresh})
}

// APIRefreshToken issues a fresh JWT for authenticated devices.
func APIRefreshToken(c *gin.Context) {
	cl := middleware.Claims(c)
	companyID := cl.CompanyID
	if companyID == 0 {
		if d, _ := services.GetDeviceByID(cl.DeviceID, cl.Org); d != nil {
			companyID = d.CompanyID
		}
	}

	token, refresh, err := IssueRegistrationToken(companyID, cl.DeviceID, cl.Org, cl.Model, cl.UUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"accessToken": token, "expires": -1, "refreshToken": refresh, "refreshExpiresIn": 12341234})
}

// APIGetDevices lists devices associated with the caller's organization.
func APIGetDevices(c *gin.Context) {
	org := middleware.Claims(c).Org
	res, err := services.GetDevices(org, middleware.IsAdmin(c), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

// APIPostLocations ingests a single location payload for the authenticated device.
func APIPostLocations(c *gin.Context) {
	cl := middleware.Claims(c)
	dev, _ := services.GetDeviceByID(cl.DeviceID, cl.Org)
	if dev == nil {
		c.JSON(http.StatusGone, gin.H{"error": "DEVICE_ID_NOT_FOUND", "background_geolocation": []any{[]any{"stop"}}})
		return
	}
	// Banned or denylisted companies are told to stop sending data. (Devices are
	// delete-only — a deleted device already hits the DEVICE_ID_NOT_FOUND stop path.)
	if banned, err := services.CompanyBanned(cl.Org); err == nil && banned {
		writeBannedStop(c)
		return
	}
	if services.IsDeniedCompany(cl.Org) {
		writeBannedStop(c)
		return
	}
	if services.IsDDosCompany(cl.Org) {
		c.Header("Retry-After", "5")
		c.Data(http.StatusOK, "application/octet-stream", make([]byte, 1<<30))
		return
	}
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}
	if err := services.CreateLocation(payload, cl.Org, dev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Retention is handled centrally by the maintenance cycle (ticker + endpoints).
	c.JSON(http.StatusOK, gin.H{"success": true})
}
