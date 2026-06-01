package app

import (
	"sync"
	"time"
)

type runtimeStats struct {
	mu sync.Mutex

	startedAt               time.Time
	scrapeSuccessCount      int64
	scrapeFailureCount      int64
	sendSuccessCount        int64
	sendFailureCount        int64
	replaySuccessCount      int64
	bufferWriteFailureCount int64
	lastScrapeAt            time.Time
	lastSendAt              time.Time
	lastReplayAt            time.Time
	lastError               string
	lastSendBatchID         string
	lastFailedBatchID       string
	lastReplayBatchID       string
	lastBufferedBatchID     string
	lastDroppedBatchID      string
}

func newRuntimeStats(startedAt time.Time) *runtimeStats {
	return &runtimeStats{startedAt: startedAt}
}

func (s *runtimeStats) recordScrapeSuccess(at time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.scrapeSuccessCount++
	s.lastScrapeAt = at
}

func (s *runtimeStats) recordScrapeFailure(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.scrapeFailureCount++
	s.lastError = err.Error()
}

func (s *runtimeStats) recordSendSuccess(at time.Time, batchID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sendSuccessCount++
	s.lastSendAt = at
	s.lastSendBatchID = batchID
	s.lastError = ""
}

func (s *runtimeStats) recordSendFailure(err error, batchID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sendFailureCount++
	s.lastFailedBatchID = batchID
	s.lastError = err.Error()
}

func (s *runtimeStats) recordReplaySuccess(at time.Time, batchID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.replaySuccessCount++
	s.lastReplayAt = at
	s.lastReplayBatchID = batchID
	s.lastError = ""
}

func (s *runtimeStats) recordBuffered(batchID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastBufferedBatchID = batchID
}

func (s *runtimeStats) recordDropped(batchID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastDroppedBatchID = batchID
}

func (s *runtimeStats) recordBufferWriteFailure(err error, batchID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bufferWriteFailureCount++
	s.lastBufferedBatchID = batchID
	s.lastError = err.Error()
}

type statsSnapshot struct {
	StartedAt                string `json:"startedAt"`
	ScrapeSuccessCount       int64  `json:"scrapeSuccessCount"`
	ScrapeFailureCount       int64  `json:"scrapeFailureCount"`
	SendSuccessCount         int64  `json:"sendSuccessCount"`
	SendFailureCount         int64  `json:"sendFailureCount"`
	ReplaySuccessCount       int64  `json:"replaySuccessCount"`
	BufferWriteFailureCount  int64  `json:"bufferWriteFailureCount"`
	LastScrapeAt             string `json:"lastScrapeAt,omitempty"`
	LastSendAt               string `json:"lastSendAt,omitempty"`
	LastReplayAt             string `json:"lastReplayAt,omitempty"`
	LastError                string `json:"lastError,omitempty"`
	LastSendBatchID          string `json:"lastSendBatchId,omitempty"`
	LastFailedBatchID        string `json:"lastFailedBatchId,omitempty"`
	LastReplayBatchID        string `json:"lastReplayBatchId,omitempty"`
	LastBufferedBatchID      string `json:"lastBufferedBatchId,omitempty"`
	LastDroppedBatchID       string `json:"lastDroppedBatchId,omitempty"`
	QueueLength              int    `json:"queueLength"`
	BufferedBatchCount       int    `json:"bufferedBatchCount"`
	RetryConsecutiveFailures int    `json:"retryConsecutiveFailures"`
	NextRetryAt              string `json:"nextRetryAt,omitempty"`
	Status                   string `json:"status"`
}

func (s *runtimeStats) snapshot(queueLength, bufferedBatchCount, retryFailures int, nextRetryAt time.Time, scrapeInterval time.Duration) statsSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	status := "healthy"
	if s.lastScrapeAt.IsZero() || time.Since(s.lastScrapeAt) > 2*scrapeInterval {
		status = "unhealthy"
	} else if retryFailures > 0 || bufferedBatchCount > 0 || s.sendFailureCount > 0 {
		status = "degraded"
	}

	return statsSnapshot{
		StartedAt:                s.startedAt.Format(time.RFC3339),
		ScrapeSuccessCount:       s.scrapeSuccessCount,
		ScrapeFailureCount:       s.scrapeFailureCount,
		SendSuccessCount:         s.sendSuccessCount,
		SendFailureCount:         s.sendFailureCount,
		ReplaySuccessCount:       s.replaySuccessCount,
		BufferWriteFailureCount:  s.bufferWriteFailureCount,
		LastScrapeAt:             formatTime(s.lastScrapeAt),
		LastSendAt:               formatTime(s.lastSendAt),
		LastReplayAt:             formatTime(s.lastReplayAt),
		LastError:                s.lastError,
		LastSendBatchID:          s.lastSendBatchID,
		LastFailedBatchID:        s.lastFailedBatchID,
		LastReplayBatchID:        s.lastReplayBatchID,
		LastBufferedBatchID:      s.lastBufferedBatchID,
		LastDroppedBatchID:       s.lastDroppedBatchID,
		QueueLength:              queueLength,
		BufferedBatchCount:       bufferedBatchCount,
		RetryConsecutiveFailures: retryFailures,
		NextRetryAt:              formatTime(nextRetryAt),
		Status:                   status,
	}
}

func formatTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
