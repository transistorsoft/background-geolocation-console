//go:build !admin && !heroku_admin

package api

import (
	"github.com/gin-gonic/gin"

	"github.com/resistorsoftware/api-service/pkg/web"
)

func registerAdminRoutes(_ *gin.Engine, _ *web.Server) {}
