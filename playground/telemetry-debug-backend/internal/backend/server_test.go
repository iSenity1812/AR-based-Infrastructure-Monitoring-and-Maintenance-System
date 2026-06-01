package backend

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestIngestStoresBatchAndStats(t *testing.T) {
	s := NewServer()
	s.nowFn = func() time.Time {
		return time.Date(2026, 5, 28, 13, 0, 0, 0, time.UTC)
	}

	body, _ := json.Marshal(Payload{
		Agent: AgentMeta{AgentID: "agent-1", Hostname: "host-1"},
		Batch: BatchMeta{BatchID: "batch-1", RecordCount: 2},
		Metrics: []MetricRecord{
			{MetricKey: "node.cpu_usage_pct"},
			{MetricKey: "node.memory_used_pct"},
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/api/telemetry/ingest", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	s.handleIngest(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected %d, got %d", http.StatusAccepted, rec.Code)
	}

	stats := s.store.stats()
	if stats["receivedBatchCount"].(int) != 1 {
		t.Fatalf("expected 1 batch, got %#v", stats["receivedBatchCount"])
	}
	if stats["lastBatchId"].(string) != "batch-1" {
		t.Fatalf("expected last batch id batch-1, got %#v", stats["lastBatchId"])
	}

	batches := s.store.batchList(1)
	if len(batches) != 1 {
		t.Fatalf("expected 1 batch in list, got %d", len(batches))
	}
	if len(batches[0].Metrics) != 2 {
		t.Fatalf("expected 2 metrics in batch detail, got %d", len(batches[0].Metrics))
	}
	if batches[0].Metrics[0].Value != nil {
		// ok to be nil here because this test only asserts the payload is preserved.
	}
}

func TestFailModeReturnsConfiguredError(t *testing.T) {
	s := NewServer()
	s.store.setFailMode(FailMode{
		StatusCode: http.StatusServiceUnavailable,
		Message:    "temporary outage",
		Remaining:  1,
	})

	req := httptest.NewRequest(http.MethodPost, "/api/telemetry/ingest", bytes.NewReader([]byte(`{}`)))
	rec := httptest.NewRecorder()
	s.handleIngest(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}
	if current := s.store.currentFailMode(); current.StatusCode != 0 {
		t.Fatalf("expected fail mode to be consumed, got %#v", current)
	}
}
