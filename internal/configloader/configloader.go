package configloader

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/pelletier/go-toml/v2"

	"github.com/resistorsoftware/api-service/pkg/api/config"
)

const (
	defaultBodyParserLimit = "10mb"
	tempConfigFilename     = "heroku-api-service.toml"
)

// EnsureConfigFile returns the configuration path used by the service, preferring
// environment variables and falling back to a TOML file when needed.
func EnsureConfigFile() (string, error) {
	cfg := config.Config{}
	populateServerConfig(&cfg.Server)
	populateDatabaseConfig(&cfg.Database)
	populateAuthConfig(&cfg.Auth)
	populateAdminConfig(&cfg.Admin)
	populateFrontendConfig(&cfg.Frontend)
	populateAccessConfig(&cfg.Access)
	populateAbuseConfig(&cfg.Abuse)
	populateSMTPConfig(&cfg.SMTP)
	populateDevelopmentConfig(&cfg.Development)

	envErr := validateEnvConfig(cfg)
	if envErr == nil {
		data, err := toml.Marshal(cfg)
		if err != nil {
			return "", fmt.Errorf("marshal env config: %w", err)
		}

		path := filepath.Join(os.TempDir(), tempConfigFilename)
		if err := os.WriteFile(path, data, 0o600); err != nil {
			return "", fmt.Errorf("write env config: %w", err)
		}
		if err := os.Setenv("API_SERVICE_CONFIG", path); err != nil {
			return "", fmt.Errorf("set API_SERVICE_CONFIG: %w", err)
		}
		return path, nil
	}

	path := strings.TrimSpace(os.Getenv("API_SERVICE_CONFIG"))
	if path == "" {
		path = "server.toml"
	}
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("%v; configuration file %s not found (set API_SERVICE_CONFIG or provide env vars)", envErr, path)
		}
		return "", fmt.Errorf("API_SERVICE_CONFIG=%s: %w", path, err)
	}
	if err := os.Setenv("API_SERVICE_CONFIG", path); err != nil {
		return "", fmt.Errorf("set API_SERVICE_CONFIG: %w", err)
	}
	return path, nil
}

func populateServerConfig(cfg *config.ServerConfig) {
	if port := intFromEnv("PORT"); port > 0 {
		cfg.Port = port
	}
	cfg.NodeEnv = stringOrDefault("NODE_ENV", "production")
	cfg.BodyParserLimit = stringOrDefault("BODY_PARSER_LIMIT", defaultBodyParserLimit)
	cfg.DataLog = boolFromEnv("DATA_LOG", false)
	cfg.Dyno = strings.TrimSpace(os.Getenv("DYNO"))
}

func populateDatabaseConfig(cfg *config.DatabaseConfig) {
	cfg.DatabaseURL = strings.TrimSpace(os.Getenv("DATABASE_URL"))
	cfg.DBConnectionURL = strings.TrimSpace(os.Getenv("DB_CONNECTION_URL"))
	cfg.SQLitePath = strings.TrimSpace(os.Getenv("SQLITE_PATH"))
	cfg.AutoMigrate = boolFromEnv("AUTO_MIGRATE", true)

	if cfg.DBConnectionURL == "" && cfg.DatabaseURL != "" {
		u, err := url.Parse(cfg.DatabaseURL)
		if err != nil {
			log.Printf("configloader: invalid DATABASE_URL (redacted): %v", err)
		} else {
			u.Path = "/postgres"
			u.RawPath = ""
			cfg.DBConnectionURL = u.String()
		}
	}
}

func populateAuthConfig(cfg *config.AuthConfig) {
	cfg.AdminUsername = strings.TrimSpace(os.Getenv("ADMIN_USERNAME"))
	cfg.AdminToken = strings.TrimSpace(os.Getenv("ADMIN_TOKEN"))
	cfg.Password = strings.TrimSpace(os.Getenv("ADMIN_PASSWORD"))
	cfg.JWTPrivateKey = strings.TrimSpace(os.Getenv("JWT_PRIVATE_KEY"))
	cfg.JWTPublicKey = strings.TrimSpace(os.Getenv("JWT_PUBLIC_KEY"))
	cfg.EncryptionPassword = strings.TrimSpace(os.Getenv("ENCRYPTION_PASSWORD"))
}

func populateAdminConfig(cfg *config.AdminConfig) {
	cfg.SurfaceEnabled = boolFromEnv("ADMIN_SURFACE_ENABLED", false)
	cfg.LoginMode = stringOrDefault("ADMIN_LOGIN_MODE", "password")
	cfg.BootstrapUsername = strings.TrimSpace(os.Getenv("ADMIN_BOOTSTRAP_USERNAME"))
	cfg.BootstrapPassword = strings.TrimSpace(os.Getenv("ADMIN_BOOTSTRAP_PASSWORD"))
	cfg.CookieName = stringOrDefault("ADMIN_COOKIE_NAME", "bgc_admin")
	cfg.CookieSecure = boolFromEnv("ADMIN_COOKIE_SECURE", false)
	cfg.SessionTTLMinutes = intFromEnv("ADMIN_SESSION_TTL_MINUTES")
	cfg.SessionMaxHours = intFromEnv("ADMIN_SESSION_MAX_HOURS")
}

func populateFrontendConfig(cfg *config.FrontendConfig) {
	cfg.GoogleAnalyticsID = strings.TrimSpace(os.Getenv("GOOGLE_ANALYTICS_ID"))
	cfg.GoogleTagManagerID = strings.TrimSpace(os.Getenv("GOOGLE_TAG_MANAGER_ID"))
	cfg.GoogleTagID = strings.TrimSpace(os.Getenv("GOOGLE_TAG_ID"))
	cfg.GoogleMapsAPIKey = strings.TrimSpace(os.Getenv("GOOGLE_MAPS_API_KEY"))
	cfg.PureChatID = strings.TrimSpace(os.Getenv("PURE_CHAT_ID"))
	cfg.SharedDashboard = boolFromEnv("SHARED_DASHBOARD", false)
}

func populateAccessConfig(cfg *config.AccessConfig) {
	cfg.DDoSBombCompanyTokens = sliceFromEnv("DDOS_BOMB_COMPANY_TOKENS")
	cfg.DeniedCompanyTokens = sliceFromEnv("DENIED_COMPANY_TOKENS")
	cfg.DeniedDeviceTokens = sliceFromEnv("DENIED_DEVICE_TOKENS")
}

func populateAbuseConfig(cfg *config.AbuseConfig) {
	cfg.Enabled = boolFromEnv("ABUSE_ENABLED", false)
	cfg.RetentionDays = intFromEnv("ABUSE_RETENTION_DAYS")
	cfg.WindowHours = intFromEnv("ABUSE_WINDOW_HOURS")
	cfg.MaxLocationsPerWindow = int64FromEnv("ABUSE_MAX_LOCATIONS_PER_WINDOW")
	cfg.MaxDevicesPerWindow = int64FromEnv("ABUSE_MAX_DEVICES_PER_WINDOW")
	cfg.AutoBan = boolFromEnv("ABUSE_AUTO_BAN", false)
	cfg.TickerIntervalMinutes = intFromEnv("ABUSE_TICKER_INTERVAL_MINUTES")
	cfg.MaintenanceToken = strings.TrimSpace(os.Getenv("ABUSE_MAINTENANCE_TOKEN"))
}

func populateSMTPConfig(cfg *config.SMTPConfig) {
	cfg.Enabled = boolFromEnv("SMTP_ENABLED", false)
	cfg.Host = strings.TrimSpace(os.Getenv("SMTP_HOST"))
	cfg.Port = intFromEnv("SMTP_PORT")
	cfg.Username = strings.TrimSpace(os.Getenv("SMTP_USERNAME"))
	cfg.APIKey = strings.TrimSpace(os.Getenv("SENDGRID_API_KEY"))
	cfg.AlertFrom = strings.TrimSpace(os.Getenv("ALERT_FROM"))
	cfg.AlertTo = strings.TrimSpace(os.Getenv("ALERT_TO"))
}

func populateDevelopmentConfig(cfg *config.DevelopmentConfig) {
	if port := intFromEnv("DEV_PORT"); port > 0 {
		cfg.DevPort = port
	}
}

func validateEnvConfig(cfg config.Config) error {
	required := []struct {
		value string
		env   string
	}{
		{cfg.Database.DatabaseURL, "DATABASE_URL"},
		{cfg.Auth.AdminUsername, "ADMIN_USERNAME"},
		{cfg.Auth.Password, "ADMIN_PASSWORD"},
		{cfg.Auth.JWTPrivateKey, "JWT_PRIVATE_KEY"},
		{cfg.Auth.JWTPublicKey, "JWT_PUBLIC_KEY"},
		{cfg.Auth.EncryptionPassword, "ENCRYPTION_PASSWORD"},
	}

	var missing []string
	for _, req := range required {
		if strings.TrimSpace(req.value) == "" {
			missing = append(missing, req.env)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required environment variables: %s (or set API_SERVICE_CONFIG)", strings.Join(missing, ", "))
	}
	return nil
}

func boolFromEnv(key string, def bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return def
	}
	val, err := strconv.ParseBool(raw)
	if err != nil {
		log.Printf("configloader: ignoring invalid boolean %s=%q: %v", key, raw, err)
		return def
	}
	return val
}

func intFromEnv(key string) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return 0
	}
	val, err := strconv.Atoi(raw)
	if err != nil {
		log.Printf("configloader: ignoring invalid integer %s=%q: %v", key, raw, err)
		return 0
	}
	return val
}

func int64FromEnv(key string) int64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return 0
	}
	val, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		log.Printf("configloader: ignoring invalid integer %s=%q: %v", key, raw, err)
		return 0
	}
	return val
}

func stringOrDefault(key, def string) string {
	if val := strings.TrimSpace(os.Getenv(key)); val != "" {
		return val
	}
	return def
}

func sliceFromEnv(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	var cleaned []string
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}
	return cleaned
}
