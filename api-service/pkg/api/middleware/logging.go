package middleware

import (
	"bytes"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// LogErrors captures response bodies and logs 5xx responses with context.
func LogErrors() gin.HandlerFunc {
	return func(c *gin.Context) {
		writer := &responseRecorder{ResponseWriter: c.Writer}
		c.Writer = writer
		start := time.Now()

		c.Next()

		status := c.Writer.Status()
		if status >= http.StatusInternalServerError {
			body := strings.TrimSpace(writer.body.String())
			if body == "" {
				body = "<empty body>"
			}
			path := c.FullPath()
			if path == "" {
				path = c.Request.URL.Path
			}
			log.Printf("HTTP %d %s %s (%s): %s", status, c.Request.Method, path, time.Since(start).Round(time.Millisecond), body)
			if len(c.Errors) > 0 {
				for _, err := range c.Errors {
					log.Printf(" -> context error: %v", err.Err)
				}
			}
		}
	}
}

type responseRecorder struct {
	gin.ResponseWriter
	body bytes.Buffer
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

func (r *responseRecorder) WriteString(s string) (int, error) {
	r.body.WriteString(s)
	return r.ResponseWriter.WriteString(s)
}
