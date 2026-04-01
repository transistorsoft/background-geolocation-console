//go:build admin || heroku || heroku_admin

package api

import (
	"fmt"
	"strings"

	"github.com/resistorsoftware/api-service/pkg/api/config"
)

// AdminStartupStatus describes the current admin capability for logs.
func AdminStartupStatus(cfg *config.Config) string {
	if cfg == nil {
		return "admin support: compiled in; configuration unavailable"
	}
	if !cfg.Admin.SurfaceEnabled {
		return "admin support: compiled in; routes disabled by config (set [admin].surface_enabled = true to expose /admin)"
	}
	mode := strings.TrimSpace(cfg.Admin.LoginMode)
	if mode == "" {
		mode = "password"
	}
	return fmt.Sprintf("admin support: compiled in; /admin enabled (login_mode=%s)", mode)
}
