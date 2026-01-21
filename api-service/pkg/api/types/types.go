package types

type RegisterRequest struct {
	DeviceID     string `json:"device_id"`
	DeviceModel  string `json:"device_model"`
	Framework    string `json:"framework"`
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	Org          string `json:"org"`
	Platform     string `json:"platform"`
	UUID         string `json:"uuid"`
	Version      string `json:"version"`
}

type AuthResponse struct {
	AccessToken  string `json:"accessToken"`
	Expires      int    `json:"expires"`
	RefreshToken string `json:"refreshToken"`
}

type Location struct {
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Accuracy  float64 `json:"accuracy"`
	Timestamp int64   `json:"timestamp"`
}
