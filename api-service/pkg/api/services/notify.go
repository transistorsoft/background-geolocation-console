package services

import (
	"fmt"
	"net/smtp"
	"strings"
	"time"

	"github.com/resistorsoftware/api-service/pkg/api/config"
)

// SendAlertEmail delivers a plaintext alert via SMTP (SendGrid by default). It is a
// no-op when email is disabled or insufficiently configured.
func SendAlertEmail(cfg config.SMTPConfig, subject, body string) error {
	if !cfg.Enabled {
		return nil
	}
	from := strings.TrimSpace(cfg.AlertFrom)
	to := strings.TrimSpace(cfg.AlertTo)
	if from == "" || to == "" {
		return fmt.Errorf("smtp alert_from and alert_to must be configured")
	}
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.Username, cfg.APIKey, cfg.Host)
	msg := buildMIME(from, to, subject, body)
	return smtp.SendMail(addr, auth, from, []string{to}, msg)
}

// buildMIME assembles a minimal plaintext email message.
func buildMIME(from, to, subject, body string) []byte {
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + subject + "\r\n")
	b.WriteString("Date: " + time.Now().UTC().Format(time.RFC1123Z) + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
	b.WriteString("\r\n")
	b.WriteString(body)
	return []byte(b.String())
}

// NotifyThresholdViolations sends a single alert email summarizing the supplied
// violations. It does nothing when there are no violations.
func NotifyThresholdViolations(violations []ThresholdViolation) error {
	if len(violations) == 0 {
		return nil
	}
	cfg, err := config.SMTP()
	if err != nil {
		return err
	}
	subject := fmt.Sprintf("[bg-console] %d company(ies) exceeded abuse thresholds", len(violations))
	var body strings.Builder
	body.WriteString("The following companies breached the configured abuse thresholds:\n\n")
	for _, v := range violations {
		body.WriteString(fmt.Sprintf("- %s — %d locations, %d devices (%s)\n",
			v.CompanyToken, v.LocationCount, v.DeviceCount, v.Reason))
	}
	body.WriteString("\nReview and act from the admin dashboard.\n")
	return SendAlertEmail(*cfg, subject, body.String())
}
