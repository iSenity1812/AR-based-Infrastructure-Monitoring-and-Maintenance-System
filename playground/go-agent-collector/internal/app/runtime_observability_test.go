package app

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
)

func TestHandleHealthReturnsServiceUnavailableBeforeSuccessfulScrape(t *testing.T) {
	r := &runner{
		cfg: &config.Config{
			Runtime: config.RuntimeConfig{
				ScrapeInterval: 5 * time.Second,
			},
		},
		deps: runtimeDeps{
			queue: newRecordQueue(10, "drop_oldest"),
		},
		retry: &retryState{},
		stats: newRuntimeStats(time.Now().UTC()),
	}

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	r.handleHealth(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}

	var snapshot statsSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if snapshot.Status != "unhealthy" {
		t.Fatalf("expected unhealthy status, got %q", snapshot.Status)
	}
}

func TestHandleStatsReturnsRuntimeSnapshot(t *testing.T) {
	now := time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC)
	r := &runner{
		cfg: &config.Config{
			Runtime: config.RuntimeConfig{
				ScrapeInterval: 5 * time.Second,
			},
		},
		deps: runtimeDeps{
			queue: newRecordQueue(10, "drop_oldest"),
		},
		retry: &retryState{
			consecutiveFailures: 2,
			nextAttemptAt:       now.Add(10 * time.Second),
		},
		stats: newRuntimeStats(now.Add(-30 * time.Second)),
		nowFn: func() time.Time { return now },
	}

	r.deps.queue.Enqueue(make([]queueRecord, 3))
	r.stats.recordScrapeSuccess(now.Add(-2 * time.Second))
	r.stats.recordSendFailure(errors.New("send failed"), "batch-failed-1")

	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	rec := httptest.NewRecorder()

	r.handleStats(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d", http.StatusOK, rec.Code)
	}

	var snapshot statsSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if snapshot.QueueLength != 3 {
		t.Fatalf("expected queue length 3, got %d", snapshot.QueueLength)
	}
	if snapshot.RetryConsecutiveFailures != 2 {
		t.Fatalf("expected retry failures 2, got %d", snapshot.RetryConsecutiveFailures)
	}
	if snapshot.Status != "degraded" {
		t.Fatalf("expected degraded status, got %q", snapshot.Status)
	}
}
