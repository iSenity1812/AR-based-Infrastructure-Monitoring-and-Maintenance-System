package app

import (
	"testing"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

func TestBuildPayloadUsesTextValueAndTags(t *testing.T) {
	cfg := &config.Config{}
	cfg.Agent.SchemaVersion = "v1"
	cfg.Agent.SourceType = "windows_exporter"
	cfg.Agent.AgentVersion = "0.1.0"
	cfg.Runtime.AgentID = "agent-1"
	cfg.Runtime.AgentName = "agent-name"
	cfg.Runtime.NodeID = "node-1"
	cfg.Runtime.Hostname = "HOST"
	cfg.Topology.Site = "lab-local"
	cfg.Topology.Environment = "poc"
	cfg.Topology.RackID = "rack-a1"
	cfg.Node.DeviceType = "laptop"

	counter := newBatchCounter()
	collectedAt := time.Date(2026, 5, 28, 4, 0, 0, 0, time.UTC)
	records := []queueRecord{{
		metric: domain.Metric{
			Name:         "node.hostname",
			TextValue:    "MSI",
			Unit:         "text",
			Labels:       map[string]string{"custom": "x"},
			SourceMetric: "windows_os_hostname",
			ScopeType:    "node",
		},
		collectedAt: collectedAt,
	}}

	payload := buildPayload(cfg, records, 0, counter, collectedAt.Add(time.Second))
	if payload.SchemaVersion != "v1" {
		t.Fatalf("expected schema version v1, got %s", payload.SchemaVersion)
	}
	if payload.Batch.RecordCount != 1 {
		t.Fatalf("expected 1 metric record, got %d", payload.Batch.RecordCount)
	}
	if payload.Metrics[0].Value != "MSI" {
		t.Fatalf("expected text value MSI, got %#v", payload.Metrics[0].Value)
	}
	if payload.Metrics[0].Tags["nodeId"] != "node-1" || payload.Metrics[0].Tags["custom"] != "x" {
		t.Fatalf("expected tags to include nodeId and labels, got %#v", payload.Metrics[0].Tags)
	}
}
