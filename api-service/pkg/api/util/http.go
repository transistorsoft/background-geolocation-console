package util

import (
	"encoding/json"
	"net/http"
)

// JSON writes a JSON response with the given status and payload.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
