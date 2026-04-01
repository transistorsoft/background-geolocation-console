//go:build !admin && !heroku_admin

package api

import "github.com/resistorsoftware/api-service/pkg/api/config"

// AdminStartupStatus describes the current admin capability for logs.
func AdminStartupStatus(_ *config.Config) string {
	return "admin support: not compiled into this binary"
}
