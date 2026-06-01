package backend

import (
	"encoding/json"
	"errors"
	"sync"
	"time"
)

type store struct {
	mu                sync.Mutex
	receivedCount     int
	receivedMetricSum int
	lastReceivedAt    time.Time
	lastBatchID       string
	lastAgentID       string
	lastError         string
	batches           []BatchSummary
	failMode          FailMode
}

func newStore() *store {
	return &store{}
}

func (s *store) save(payload Payload, now time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.receivedCount++
	s.receivedMetricSum += len(payload.Metrics)
	s.lastReceivedAt = now.UTC()
	s.lastBatchID = payload.Batch.BatchID
	s.lastAgentID = payload.Agent.AgentID
	s.lastError = ""
	s.batches = append([]BatchSummary{summarize(payload, now)}, s.batches...)
	if len(s.batches) > 50 {
		s.batches = s.batches[:50]
	}
}

func (s *store) stats() map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()

	return map[string]any{
		"status":             "ok",
		"receivedBatchCount": s.receivedCount,
		"receivedMetricSum":  s.receivedMetricSum,
		"lastReceivedAt":     formatTime(s.lastReceivedAt),
		"lastBatchId":        s.lastBatchID,
		"lastAgentId":        s.lastAgentID,
		"lastError":          s.lastError,
		"failMode":           s.failMode,
	}
}

func (s *store) batchList(limit int) []BatchSummary {
	s.mu.Lock()
	defer s.mu.Unlock()

	if limit <= 0 || limit > len(s.batches) {
		limit = len(s.batches)
	}
	return append([]BatchSummary(nil), s.batches[:limit]...)
}

func (s *store) setFailMode(mode FailMode) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.failMode = mode
}

func (s *store) currentFailMode() FailMode {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.failMode
}

func (s *store) consumeFailure() (FailMode, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.failMode.StatusCode == 0 {
		return FailMode{}, false
	}
	mode := s.failMode
	if s.failMode.Remaining > 0 {
		s.failMode.Remaining--
		if s.failMode.Remaining == 0 {
			s.failMode = FailMode{}
		}
	}
	return mode, true
}

func (s *store) recordError(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastError = err.Error()
}

func summarize(payload Payload, now time.Time) BatchSummary {
	keys := make([]string, 0, min(len(payload.Metrics), 8))
	seen := map[string]struct{}{}
	for _, metric := range payload.Metrics {
		if _, ok := seen[metric.MetricKey]; ok {
			continue
		}
		seen[metric.MetricKey] = struct{}{}
		keys = append(keys, metric.MetricKey)
		if len(keys) == 8 {
			break
		}
	}

	return BatchSummary{
		BatchID:      payload.Batch.BatchID,
		AgentID:      payload.Agent.AgentID,
		Hostname:     payload.Agent.Hostname,
		RecordCount:  payload.Batch.RecordCount,
		DroppedCount: payload.Batch.DroppedCount,
		ReceivedAt:   now.UTC().Format(time.RFC3339),
		MetricKeys:   keys,
		Metrics:      append([]MetricRecord(nil), payload.Metrics...),
	}
}

func decodeFailMode(body []byte) (FailMode, error) {
	var mode FailMode
	if err := json.Unmarshal(body, &mode); err != nil {
		return FailMode{}, err
	}
	if mode.StatusCode < 0 {
		return FailMode{}, errors.New("statusCode must be >= 0")
	}
	return mode, nil
}

func formatTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
