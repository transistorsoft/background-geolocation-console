//go:build admin

package handlers

import (
	"embed"
	"html/template"
	"sync"

	"github.com/gin-gonic/gin"
)

//go:embed admin_templates/*.html
var adminTemplateFS embed.FS

var (
	adminTemplates     *template.Template
	adminTemplatesErr  error
	adminTemplatesOnce sync.Once
)

func renderAdminTemplate(c *gin.Context, name string, data any) {
	tmpl, err := adminTemplateSet()
	if err != nil {
		c.String(500, err.Error())
		return
	}
	c.Header("Content-Type", "text/html; charset=utf-8")
	if err := tmpl.ExecuteTemplate(c.Writer, name, data); err != nil {
		c.String(500, err.Error())
	}
}

func adminTemplateSet() (*template.Template, error) {
	adminTemplatesOnce.Do(func() {
		adminTemplates, adminTemplatesErr = template.ParseFS(adminTemplateFS, "admin_templates/*.html")
	})
	return adminTemplates, adminTemplatesErr
}
