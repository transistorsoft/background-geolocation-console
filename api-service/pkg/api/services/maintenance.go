package services

import (
	"log"
	"time"

	"github.com/resistorsoftware/api-service/pkg/api/config"
)

// RunCleanup purges location data older than the configured retention window and
// returns the number of rows removed. It runs regardless of the abuse master switch
// so an administrator can trigger it manually.
func RunCleanup() (int64, error) {
	abuse, err := config.Abuse()
	if err != nil {
		return 0, err
	}
	retention := time.Duration(abuse.RetentionDays) * 24 * time.Hour
	deleted, err := PurgeExpiredLocations(retention)
	if err != nil {
		return 0, err
	}
	if deleted > 0 {
		log.Printf("maintenance: purged %d expired location(s) (retention %d days)", deleted, abuse.RetentionDays)
	}
	return deleted, nil
}

// RunThresholdCheck evaluates abuse thresholds, optionally auto-bans offenders, and
// sends an alert email. It returns the detected violations.
func RunThresholdCheck() ([]ThresholdViolation, error) {
	abuse, err := config.Abuse()
	if err != nil {
		return nil, err
	}
	violations, err := EvaluateThresholds(*abuse)
	if err != nil {
		return nil, err
	}
	if len(violations) == 0 {
		return nil, nil
	}
	log.Printf("maintenance: %d threshold violation(s) detected", len(violations))
	if abuse.AutoBan {
		for _, v := range violations {
			if err := BanCompany(v.CompanyToken, "auto-ban: "+v.Reason); err != nil {
				log.Printf("maintenance: auto-ban %s: %v", v.CompanyToken, err)
			}
		}
	}
	if err := NotifyThresholdViolations(violations); err != nil {
		log.Printf("maintenance: alert email error: %v", err)
	}
	return violations, nil
}

// RunMaintenanceCycle runs the full automated maintenance pass (cleanup + threshold
// checks). It is a no-op when abuse control is disabled. Used by the in-process ticker.
func RunMaintenanceCycle() error {
	abuse, err := config.Abuse()
	if err != nil {
		return err
	}
	if !abuse.Enabled {
		return nil
	}
	if _, err := RunCleanup(); err != nil {
		log.Printf("maintenance: cleanup error: %v", err)
	}
	if _, err := RunThresholdCheck(); err != nil {
		log.Printf("maintenance: threshold check error: %v", err)
	}
	return nil
}
