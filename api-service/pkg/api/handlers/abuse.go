package handlers

import (
	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/services"
)

// writeBannedStop emits the single, centralized "stop" response sent to banned or
// denied companies/devices. It is the one place to swap in the SDK-spec payload —
// see services.BannedStopPayload.
func writeBannedStop(c *gin.Context) {
	status, body := services.BannedStopPayload()
	c.JSON(status, body)
}
