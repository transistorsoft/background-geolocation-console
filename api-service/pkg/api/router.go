package api

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/api/handlers"
	"github.com/resistorsoftware/api-service/pkg/api/middleware"
	"github.com/resistorsoftware/api-service/pkg/web"
)

// New constructs a Gin engine with both the mobile API surface and the public dashboard.
func New() http.Handler {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), middleware.LogErrors())

	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	apiGroup := r.Group("/api")
	{
		apiGroup.POST("/register", handlers.APIRegister)
		apiGroup.POST("/refresh_token", middleware.CheckAuthRequired(), handlers.APIRefreshToken)
		apiGroup.GET("/devices", middleware.CheckAuthRequired(), handlers.APIGetDevices)
		apiGroup.POST("/locations", middleware.CheckAuthRequired(), handlers.APIPostLocations)
	}

	registerSiteRoutes(r)
	dashboard, err := web.NewServer()
	if err != nil {
		log.Fatalf("web ui: %v", err)
	}
	registerAdminRoutes(r, dashboard)
	dashboard.Register(r)

	return r
}

func registerSiteRoutes(r *gin.Engine) {
	site := r.Group("/api/site")
	site.GET("/env", handlers.SiteGetEnv)
	site.POST("/jwt", handlers.SitePostJWT)

	protected := site.Group("/")
	protected.Use(middleware.CheckAuthRequired())
	{
		protected.GET("/company_tokens", handlers.SiteGetCompanyTokens)
		protected.GET("/devices", handlers.SiteGetDevices)
		protected.DELETE("/devices/:id", handlers.SiteDeleteDevice)
		protected.GET("/locations", handlers.SiteGetLocations)
		protected.GET("/locations/latest", handlers.SiteGetLatestLocation)
	}
}
