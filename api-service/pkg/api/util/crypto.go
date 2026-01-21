package util

import "github.com/gin-gonic/gin"

// IsEncryptedRequest reports whether the request body is encrypted.
func IsEncryptedRequest(c *gin.Context) bool { return false }

// Decrypt is a stub for RN crypto integration.
func Decrypt(b []byte) []byte { return b }
