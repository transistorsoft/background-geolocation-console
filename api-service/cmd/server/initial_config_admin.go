//go:build admin || heroku || heroku_admin

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func writeInitialConfig(path string) error {
	if dir := filepath.Dir(path); dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	adminToken, err := randomBase64(24)
	if err != nil {
		return err
	}
	adminPassword, err := randomBase64(16)
	if err != nil {
		return err
	}
	signingKey, err := randomBase64(48)
	if err != nil {
		return err
	}
	encryptionPassword, err := randomBase64(24)
	if err != nil {
		return err
	}
	template := fmt.Sprintf(`# Generated on %s
# Update these values to match your environment.
[server]
port = 9000
node_env = "development"
body_parser_limit = "1mb"
data_log = false
dyno = "local"

[database]
database_url = ""
db_connection_url = ""
sqlite_path = "./data/api-service.db"
auto_migrate = true

[auth]
admin_username = "admin"
admin_token = "%s"
password = "%s"
jwt_private_key = "%s"
jwt_public_key = ""
encryption_password = "%s"

[admin]
surface_enabled = false
login_mode = "password"
bootstrap_username = ""
bootstrap_password = ""
cookie_name = "bgc_admin"
cookie_secure = false
session_ttl_minutes = 30
session_max_hours = 8

[frontend]
google_maps_api_key = ""
google_analytics_id = ""
google_tag_manager_id = ""
google_tag_id = ""
pure_chat_id = ""
shared_dashboard = false

[access]
ddos_bomb_company_tokens = []
denied_company_tokens = []
denied_device_tokens = []

[development]
dev_port = 8080
`, time.Now().Format(time.RFC3339), adminToken, adminPassword, signingKey, encryptionPassword)
	return os.WriteFile(path, []byte(template), 0o600)
}
