package app

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func (r *runner) startObservability(ctx context.Context) {
	if !r.cfg.Features.LocalHealthEndpoint {
		return
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", r.handleHealth)
	mux.HandleFunc("/stats", r.handleStats)

	server := &http.Server{
		Addr:              r.cfg.Observability.HealthAddress,
		Handler:           mux,
		ReadHeaderTimeout: 2 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("observability server failed: %v\n", err)
		}
	}()
}

func (r *runner) handleHealth(w http.ResponseWriter, _ *http.Request) {
	snapshot := r.snapshot()
	statusCode := http.StatusOK
	if snapshot.Status == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}
	writeJSON(w, statusCode, snapshot)
}

func (r *runner) handleStats(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, r.snapshot())
}

func (r *runner) snapshot() statsSnapshot {
	return r.stats.snapshot(
		r.deps.queue.Len(),
		r.bufferedCount(),
		r.retry.consecutiveFailures,
		r.retry.nextAttemptAt,
		r.cfg.Runtime.ScrapeInterval,
	)
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_, _ = w.Write(body)
}
