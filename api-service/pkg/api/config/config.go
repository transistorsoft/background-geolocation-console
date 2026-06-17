// Package config provides for a nice convenience in terms of the provided values in the server.toml file
package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/pelletier/go-toml/v2"
)

// ServerConfig describes the server runtime configuration values.
type ServerConfig struct {
	Port            int    `toml:"port"`
	NodeEnv         string `toml:"node_env"`
	BodyParserLimit string `toml:"body_parser_limit"`
	DataLog         bool   `toml:"data_log"`
	Dyno            string `toml:"dyno"`
}

// DatabaseConfig captures database connection settings.
type DatabaseConfig struct {
	DatabaseURL     string `toml:"database_url"`
	DBConnectionURL string `toml:"db_connection_url"`
	SQLitePath      string `toml:"sqlite_path"`
	AutoMigrate     bool   `toml:"auto_migrate"`
}

// AuthConfig holds administrative and JWT configuration.
type AuthConfig struct {
	AdminUsername      string `toml:"admin_username"`
	AdminToken         string `toml:"admin_token"`
	Password           string `toml:"password"`
	JWTPrivateKey      string `toml:"jwt_private_key"`
	JWTPublicKey       string `toml:"jwt_public_key"`
	EncryptionPassword string `toml:"encryption_password"`
}

// AdminConfig holds the optional admin surface configuration.
type AdminConfig struct {
	SurfaceEnabled    bool   `toml:"surface_enabled"`
	LoginMode         string `toml:"login_mode"`
	BootstrapUsername string `toml:"bootstrap_username"`
	BootstrapPassword string `toml:"bootstrap_password"`
	CookieName        string `toml:"cookie_name"`
	CookieSecure      bool   `toml:"cookie_secure"`
	SessionTTLMinutes int    `toml:"session_ttl_minutes"`
	SessionMaxHours   int    `toml:"session_max_hours"`
}

// FrontendConfig holds keys that are safe to expose to the frontend.
type FrontendConfig struct {
	GoogleAnalyticsID  string `toml:"google_analytics_id"`
	GoogleTagManagerID string `toml:"google_tag_manager_id"`
	GoogleTagID        string `toml:"google_tag_id"`
	GoogleMapsAPIKey   string `toml:"google_maps_api_key"`
	PureChatID         string `toml:"pure_chat_id"`
	SharedDashboard    bool   `toml:"shared_dashboard"`
}

// AccessConfig lists tokens used to gate access to the API.
type AccessConfig struct {
	DDoSBombCompanyTokens []string `toml:"ddos_bomb_company_tokens"`
	DeniedCompanyTokens   []string `toml:"denied_company_tokens"`
	DeniedDeviceTokens    []string `toml:"denied_device_tokens"`
}

// AbuseConfig controls abuse detection, retention purging, and the maintenance scheduler.
type AbuseConfig struct {
	Enabled               bool   `toml:"enabled"`                  // master switch; retention purge stays off until true
	RetentionDays         int    `toml:"retention_days"`           // default 90
	WindowHours           int    `toml:"window_hours"`             // activity/threshold window, default 24
	MaxLocationsPerWindow int64  `toml:"max_locations_per_window"` // 0 disables the locations threshold
	MaxDevicesPerWindow   int64  `toml:"max_devices_per_window"`   // 0 disables the devices threshold
	AutoBan               bool   `toml:"auto_ban"`                 // false → alert only
	TickerIntervalMinutes int    `toml:"ticker_interval_minutes"`  // default 60; 0 disables the in-process ticker
	MaintenanceToken      string `toml:"maintenance_token"`        // shared secret for cron-triggered maintenance endpoints
}

// SMTPConfig holds the outbound email settings used for abuse alerts (SendGrid SMTP by default).
type SMTPConfig struct {
	Enabled   bool   `toml:"enabled"`
	Host      string `toml:"host"`     // default smtp.sendgrid.net
	Port      int    `toml:"port"`     // default 587
	Username  string `toml:"username"` // default "apikey" for SendGrid
	APIKey    string `toml:"api_key"`  // SendGrid API key (SMTP password)
	AlertFrom string `toml:"alert_from"`
	AlertTo   string `toml:"alert_to"`
}

// DevelopmentConfig captures the values intended for local development tooling.
type DevelopmentConfig struct {
	DevPort int `toml:"dev_port"`
}

// Config models the values supplied by server.toml for the API service.
type Config struct {
	Server      ServerConfig      `toml:"server"`
	Database    DatabaseConfig    `toml:"database"`
	Auth        AuthConfig        `toml:"auth"`
	Admin       AdminConfig       `toml:"admin"`
	Frontend    FrontendConfig    `toml:"frontend"`
	Access      AccessConfig      `toml:"access"`
	Abuse       AbuseConfig       `toml:"abuse"`
	SMTP        SMTPConfig        `toml:"smtp"`
	Development DevelopmentConfig `toml:"development"`
}

const defaultConfigPath = "server.toml"

var (
	cfg     Config
	loadErr error
	once    sync.Once
)

// Load returns the parsed configuration, reading server.toml once.
func Load() (*Config, error) {
	once.Do(func() {
		path := os.Getenv("API_SERVICE_CONFIG")
		if path == "" {
			path = defaultConfigPath
		}

		data, err := os.ReadFile(path)
		if err != nil {
			loadErr = fmt.Errorf("read config %s: %w", path, err)
			return
		}

		if err := toml.Unmarshal(data, &cfg); err != nil {
			loadErr = fmt.Errorf("parse config %s: %w", path, err)
			return
		}
	})

	if loadErr != nil {
		return nil, loadErr
	}

	return &cfg, nil
}

var (
	ErrMissingJWTKey    = errors.New("auth.jwt_private_key is empty")
	ErrMissingJWTPubKey = errors.New("auth.jwt_public_key is empty")
)

// Server returns the server configuration values.
func Server() (*ServerConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	return &cfg.Server, nil
}

// Database returns the database configuration values.
func Database() (*DatabaseConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	return &cfg.Database, nil
}

// Auth returns the authentication configuration values.
func Auth() (*AuthConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	return &cfg.Auth, nil
}

// Admin returns the admin surface configuration values.
func Admin() (*AdminConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	admin := cfg.Admin
	if strings.TrimSpace(admin.LoginMode) == "" {
		admin.LoginMode = "password"
	}
	if strings.TrimSpace(admin.CookieName) == "" {
		admin.CookieName = "bgc_admin"
	}
	if admin.SessionTTLMinutes <= 0 {
		admin.SessionTTLMinutes = 480
	}
	if admin.SessionMaxHours <= 0 {
		admin.SessionMaxHours = 8
	}
	if strings.TrimSpace(admin.BootstrapUsername) == "" {
		admin.BootstrapUsername = strings.TrimSpace(cfg.Auth.AdminUsername)
	}
	if strings.TrimSpace(admin.BootstrapPassword) == "" {
		admin.BootstrapPassword = strings.TrimSpace(cfg.Auth.Password)
	}
	return &admin, nil
}

// Frontend returns values intended for frontend consumption.
func Frontend() (*FrontendConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	return &cfg.Frontend, nil
}

// Access returns the access control lists configured for the API.
func Access() (*AccessConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	return &cfg.Access, nil
}

// Abuse returns the abuse-control configuration with sensible defaults applied.
func Abuse() (*AbuseConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	abuse := cfg.Abuse
	if abuse.RetentionDays <= 0 {
		abuse.RetentionDays = 90
	}
	if abuse.WindowHours <= 0 {
		abuse.WindowHours = 24
	}
	if abuse.TickerIntervalMinutes == 0 {
		abuse.TickerIntervalMinutes = 60
	}
	return &abuse, nil
}

// SMTP returns the outbound email configuration with SendGrid defaults applied.
func SMTP() (*SMTPConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	smtp := cfg.SMTP
	if strings.TrimSpace(smtp.Host) == "" {
		smtp.Host = "smtp.sendgrid.net"
	}
	if smtp.Port <= 0 {
		smtp.Port = 587
	}
	if strings.TrimSpace(smtp.Username) == "" {
		smtp.Username = "apikey"
	}
	return &smtp, nil
}

// Development returns values intended for local development utilities.
func Development() (*DevelopmentConfig, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	return &cfg.Development, nil
}

// JWTPrivateKey returns the configured JWT signing key bytes.
func JWTPrivateKey() ([]byte, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(cfg.Auth.JWTPrivateKey) == "" {
		return nil, ErrMissingJWTKey
	}
	return []byte(cfg.Auth.JWTPrivateKey), nil
}

// JWTPublicKey returns the configured JWT public key bytes.
func JWTPublicKey() ([]byte, error) {
	cfg, err := Load()
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(cfg.Auth.JWTPublicKey) == "" {
		return nil, ErrMissingJWTPubKey
	}
	return []byte(cfg.Auth.JWTPublicKey), nil
}

// ResetForTests clears cached config state so tests can load fresh config values.
func ResetForTests() {
	cfg = Config{}
	loadErr = nil
	once = sync.Once{}
}
