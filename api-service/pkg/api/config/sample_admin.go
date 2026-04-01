//go:build admin || heroku_admin

package config

const sampleConfig = `# ===========================
# Sample Server Configuration
# ===========================
[server]
port = 9000
node_env = "development"
body_parser_limit = "1mb"
data_log = false
dyno = "local"

# ===========================
# Database
# ===========================
[database]
database_url = ""
db_connection_url = ""
sqlite_path = "./data/api-service.db"
auto_migrate = true

# ===========================
# Authentication
# ===========================
[auth]
admin_username = "admin"
admin_token = "changeme"
password = "changeme"
jwt_private_key = """-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQDXMH2k9VQy6YfQ0lOq3qsUNVvk2eT4Bhe+wEHjIXoy8IdWigd7
gE5uLw1oY+y0AwbvfDJFyZQidh+NROm4tW7x1YgnSUZXoqBYwygJyI072QtdgQXl
RzJuY9hw3rroWAtxEvsC0BpvyOukgqS0bkkCm1cWg5kybkADVY6jwxKF1wIDAQAB
AoGAaK1tnE+bBZ5qTqL0U8nyCLlcsoFV3ayhtq/Y5cHIzoHmr18bODsPwhj/Kg2L
zWx/ju0RduCMsZ/HXXIQK5vCk1vZ1tcHTul3e8DqRL3OjaxAg/P6nxsVXni4eWhv
apMI2vlA38nSxrdbidKdvUSsfx8bVsgcuyo6edSxnl2xeIECQQD1uQPiEhDRbugg
4iigIvuXvYDn8ApX2HFqRSbuuSSMzdON3NofM8JrIoVNewc19hXtOD87mpy4V/mQ
WDVYj1ibAkEA5Ao7P5NdVs4KJIp4jOSAmhpN6wX6ZspGDZCBoBPXaGNsq4CPGK/c
kbIJuPqrs9jwELyhl725LLJoPLt114F8GwJBAJ7q7zyBbs6k8ZZrVSu2CevulaHY
Ec/WWEDuJeayQMZT6X0hgqP/d9vywgq6Z9erjRzCQXDpUe1koRaSPoaqe7cCQQCT
P24VXni4eWhvapMI2vlA38nSxrdbidKdvUSsfx8bVsgcuyo6edSxnl2xeIECQQCb
VYj1ibWT7qDnzL2mYIZxZOKhHvJRAkEAxXHzkwmo7aX6ixkmKuuNHYsYvwdivgLP
AvFp8ZUBKbjsggq09uXBJgp7wa9u0edPFsKnz03Wx/ju0RduCMsZA==
-----END RSA PRIVATE KEY-----"""
jwt_public_key = """-----BEGIN RSA PUBLIC KEY-----
MIGJAoGBAHSlrNvKcJsteVEh9UpAJZciV06Pq4jG3Ejj6+UeJ8V+RaHcRUW2KIiA
WcN6iYG3PaY5E9O+V1YxDCEV4VpWw2X2gYdEx+kt1/3uzMdGII4XESyqSeX5TR1f
E2no0RvrRZtGJPD7WvyaManIeZDV4mQSSHqzTeWY5AvzkdxlIo0lAgMBAAE=
-----END RSA PUBLIC KEY-----"""
encryption_password = "changeme"

[admin]
surface_enabled = false
login_mode = "password"
bootstrap_username = ""
bootstrap_password = ""
cookie_name = "bgc_admin"
cookie_secure = false
session_ttl_minutes = 30
session_max_hours = 8

# ===========================
# Frontend-exposed Keys
# ===========================
[frontend]
google_analytics_id = ""
google_tag_manager_id = ""
google_tag_id = ""
google_maps_api_key = ""
pure_chat_id = ""
shared_dashboard = false

# ===========================
# Access Control Lists
# ===========================
[access]
ddos_bomb_company_tokens = []
denied_company_tokens = []
denied_device_tokens = []

# ===========================
# Development Utilities
# ===========================
[development]
dev_port = 8080
`

// SampleConfig returns a copy of the starter server configuration template.
func SampleConfig() []byte {
	buf := make([]byte, len(sampleConfig))
	copy(buf, []byte(sampleConfig))
	return buf
}
