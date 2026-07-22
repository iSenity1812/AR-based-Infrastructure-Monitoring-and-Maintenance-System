package adapter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
	"net/http"
	"strings"
	"time"
)

const monitoringSyncSecretHeader = "x-monitoring-sync-secret"

type MonitoringHeartbeatAdapter struct {
	baseURL      string
	sharedSecret string
	httpClient   *http.Client
}

var _ port.CollectorHeartbeatSyncPort = (*MonitoringHeartbeatAdapter)(nil)

func NewMonitoringHeartbeatAdapter(
	baseURL string,
	sharedSecret string,
	timeout time.Duration,
) port.CollectorHeartbeatSyncPort {
	trimmedBaseURL := strings.TrimRight(baseURL, "/")
	if trimmedBaseURL == "" {
		return nil
	}

	if timeout <= 0 {
		timeout = 5 * time.Second
	}

	return &MonitoringHeartbeatAdapter{
		baseURL:      trimmedBaseURL,
		sharedSecret: sharedSecret,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (a *MonitoringHeartbeatAdapter) SyncCollectorHeartbeat(
	ctx context.Context,
	signal *domain.CollectorHeartbeatSignal,
) error {
	if signal == nil {
		return nil
	}

	payload, err := json.Marshal(struct {
		NodeID       string `json:"nodeId"`
		AgentID      string `json:"agentId"`
		ObservedAt   string `json:"observedAt"`
		Source       string `json:"source"`
		MetricKey    string `json:"metricKey"`
		SourceMetric string `json:"sourceMetric"`
	}{
		NodeID:       signal.NodeID,
		AgentID:      signal.AgentID,
		ObservedAt:   signal.ObservedAt,
		Source:       signal.Source,
		MetricKey:    signal.MetricKey,
		SourceMetric: signal.SourceMetric,
	})
	if err != nil {
		return fmt.Errorf("marshal collector heartbeat sync payload: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		a.baseURL+"/internal/collectors/heartbeat/sync",
		bytes.NewReader(payload),
	)
	if err != nil {
		return fmt.Errorf("build collector heartbeat sync request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if a.sharedSecret != "" {
		req.Header.Set(monitoringSyncSecretHeader, a.sharedSecret)
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send collector heartbeat sync request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("collector heartbeat sync returned status %d", resp.StatusCode)
	}

	return nil
}
