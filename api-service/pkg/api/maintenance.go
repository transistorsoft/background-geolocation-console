package api

import (
	"context"
	"log"
	"sync/atomic"
	"time"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/services"
)

// StartBackground starts any long-running background workers and returns a stop
// function that cancels them and waits for them to exit.
func StartBackground(ctx context.Context) func() {
	return StartMaintenanceTicker(ctx)
}

// StartMaintenanceTicker launches the periodic maintenance goroutine. It is a no-op
// (returning a no-op stop function) when abuse control is disabled or the configured
// interval is non-positive.
func StartMaintenanceTicker(parent context.Context) func() {
	abuse, err := config.Abuse()
	if err != nil {
		log.Printf("maintenance: config unavailable, ticker disabled: %v", err)
		return func() {}
	}
	if !abuse.Enabled || abuse.TickerIntervalMinutes <= 0 {
		log.Printf("maintenance: in-process ticker disabled (enabled=%v interval=%dm)", abuse.Enabled, abuse.TickerIntervalMinutes)
		return func() {}
	}

	interval := time.Duration(abuse.TickerIntervalMinutes) * time.Minute
	ctx, cancel := context.WithCancel(parent)
	done := make(chan struct{})
	var running int32

	go func() {
		defer close(done)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		log.Printf("maintenance: ticker started (every %s)", interval)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// Guard against overlapping cycles if a pass runs long.
				if !atomic.CompareAndSwapInt32(&running, 0, 1) {
					log.Printf("maintenance: previous cycle still running, skipping tick")
					continue
				}
				if err := services.RunMaintenanceCycle(); err != nil {
					log.Printf("maintenance: cycle error: %v", err)
				}
				atomic.StoreInt32(&running, 0)
			}
		}
	}()

	return func() {
		cancel()
		<-done
	}
}
