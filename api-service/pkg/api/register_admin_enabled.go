//go:build admin || heroku || heroku_admin

package api

import (
	"log"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/handlers"
	"github.com/resistorsoftware/api-service/pkg/api/middleware"
	"github.com/resistorsoftware/api-service/pkg/web"
)

func registerAdminRoutes(r *gin.Engine, dashboard *web.Server) {
	adminCfg, err := config.Admin()
	if err != nil {
		log.Printf("admin config unavailable: %v", err)
		return
	}
	if adminCfg == nil || !adminCfg.SurfaceEnabled {
		return
	}

	r.GET("/admin/login", handlers.AdminLoginPage)
	r.POST("/admin/login", middleware.CheckAdminCSRFFromRequest(), handlers.AdminLogin)
	r.POST("/admin/logout", middleware.CheckAdminRequired(), middleware.CheckAdminCSRFFromRequest(), handlers.AdminLogout)

	admin := r.Group("/admin")
	admin.Use(middleware.CheckAdminRequired())
	{
		dashboard.RegisterAdmin(admin)
		admin.POST("/devices/:id/delete", middleware.CheckAdminCSRFFromRequest(), handlers.AdminDeleteDevicePost)
	}

	adminAPI := r.Group("/admin/api")
	adminAPI.Use(middleware.CheckAdminAPIRequired())
	{
		adminAPI.GET("/session", handlers.AdminSession)
		adminAPI.GET("/companies", handlers.AdminGetCompanies)
		adminAPI.GET("/devices", handlers.AdminGetDevices)
		adminAPI.GET("/locations", handlers.AdminGetLocations)
		adminAPI.GET("/locations/latest", handlers.AdminGetLatestLocation)
		adminAPI.DELETE("/devices/:id", middleware.CheckAdminCSRFFromRequest(), handlers.AdminDeleteDevice)
	}
}
