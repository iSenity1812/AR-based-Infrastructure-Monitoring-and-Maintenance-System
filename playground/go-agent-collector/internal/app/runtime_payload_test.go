package app

import (
	"testing"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

func TestBuildPayloadUsesTextValueAndTags(t *testing.T) {
	cfg := &config.Config{}
	cfg.Agent.SchemaVersion = "v1"
	cfg.Agent.SourceType = "windows_exporter"
	cfg.Agent.AgentVersion = "0.1.0"
	cfg.Runtime.AgentID = "agent-1"
	cfg.Runtime.AgentName = "agent-name"
	cfg.Runtime.AgentSourceType = "multi_source"
	cfg.Runtime.NodeID = "node-1"
	cfg.Runtime.Hostname = "HOST"
	cfg.Node.DeviceType = "laptop"
	cfg.Runtime.OSProduct = "Windows 11 Pro"
	cfg.Runtime.CPUArchitecture = "x86_64"
	cfg.Runtime.LogicalCPUCount = 16
	cfg.Runtime.HardwareSerial = "SERIAL-123"

	counter := newBatchCounter()
	collectedAt := time.Date(2026, 5, 28, 4, 0, 0, 0, time.UTC)
	expectedCollectedAt := collectedAt.In(vietnamLocation).Format(time.RFC3339)
	records := []queueRecord{{
		metric: domain.Metric{
			Name:         "node.hostname",
			TextValue:    "MSI",
			Unit:         "text",
			Labels:       map[string]string{"custom": "x"},
			SourceMetric: "windows_os_hostname",
			ScopeType:    "node",
			Source:       "windows_exporter",
		},
		collectedAt: collectedAt,
	}}

	payload := buildPayload(cfg, records, 0, counter, collectedAt.Add(time.Second), sender.PayloadContext{
		HardwareFingerprint: sender.HardwareFingerprint{
			MotherboardModel: "MSI MS-158L",
			CPUModel:         "AMD Ryzen 7 5800H with Radeon Graphics",
			GPUModelPrimary:  "AMD Radeon RX 6600M",
			SSDModelPrimary:  "KINGSTON SNV2S1000G",
			BatteryModel:     "MS-158L",
		},
	})
	if payload.SchemaVersion != "v1" {
		t.Fatalf("expected schema version v1, got %s", payload.SchemaVersion)
	}
	if payload.Batch.RecordCount != 2 {
		t.Fatalf("expected 2 metric records including heartbeat, got %d", payload.Batch.RecordCount)
	}
	if payload.Metrics[0].Value != "MSI" {
		t.Fatalf("expected text value MSI, got %#v", payload.Metrics[0].Value)
	}
	if payload.Metrics[0].Tags["custom"] != "x" {
		t.Fatalf("expected metric tags to keep only metric-specific labels, got %#v", payload.Metrics[0].Tags)
	}
	if payload.Metrics[0].Tags["nodeId"] != "" || payload.Metrics[0].Tags["rackId"] != "" || payload.Metrics[0].Tags["site"] != "" {
		t.Fatalf("expected duplicated/sensitive node tags to be omitted, got %#v", payload.Metrics[0].Tags)
	}
	if payload.Metrics[0].Source != "windows_exporter" {
		t.Fatalf("expected metric source to be preserved, got %q", payload.Metrics[0].Source)
	}
	if payload.Agent.SourceType != "multi_source" {
		t.Fatalf("expected agent source type to use runtime override, got %q", payload.Agent.SourceType)
	}
	if payload.Context.Identity.NodeID != "node-1" || payload.Context.Identity.Hostname != "HOST" {
		t.Fatalf("expected shared identity context, got %#v", payload.Context.Identity)
	}
	if payload.Context.HardwareFingerprint.OSProduct != "Windows 11 Pro" || payload.Context.HardwareFingerprint.HardwareSerial != "SERIAL-123" {
		t.Fatalf("expected shared hardware fingerprint context, got %#v", payload.Context.HardwareFingerprint)
	}
	if payload.Context.HardwareFingerprint.MotherboardModel != "MSI MS-158L" || payload.Context.HardwareFingerprint.SSDModelPrimary != "KINGSTON SNV2S1000G" {
		t.Fatalf("expected lhm fingerprint enrichments to merge into shared context, got %#v", payload.Context.HardwareFingerprint)
	}
	if payload.Batch.CollectedAt != expectedCollectedAt {
		t.Fatalf("expected collectedAt to be formatted in Vietnam time, got %s", payload.Batch.CollectedAt)
	}
	if payload.Metrics[0].Timestamp != expectedCollectedAt {
		t.Fatalf("expected metric timestamp to be formatted in Vietnam time, got %s", payload.Metrics[0].Timestamp)
	}
	heartbeat := payload.Metrics[1]
	if heartbeat.MetricKey != heartbeatMetricKey {
		t.Fatalf("expected heartbeat metric key %q, got %#v", heartbeatMetricKey, heartbeat)
	}
	if heartbeat.Value != 1 {
		t.Fatalf("expected heartbeat value 1, got %#v", heartbeat.Value)
	}
	if heartbeat.SourceMetric != heartbeatMetricSource {
		t.Fatalf("expected heartbeat source metric %q, got %#v", heartbeatMetricSource, heartbeat)
	}
	if heartbeat.Timestamp != collectedAt.Add(time.Second).In(vietnamLocation).Format(time.RFC3339) {
		t.Fatalf("expected heartbeat timestamp to use send time, got %s", heartbeat.Timestamp)
	}
}

func TestBuildPayloadUsesLatestCollectedAtForBatch(t *testing.T) {
	cfg := &config.Config{}
	cfg.Agent.SchemaVersion = "v1"
	cfg.Runtime.AgentID = "agent-1"
	cfg.Runtime.AgentName = "agent-name"
	cfg.Runtime.NodeID = "node-1"
	cfg.Runtime.Hostname = "HOST"

	counter := newBatchCounter()
	sentAt := time.Date(2026, 5, 28, 4, 1, 0, 0, time.UTC)
	older := sentAt.Add(-30 * time.Second)
	newer := sentAt.Add(-5 * time.Second)

	payload := buildPayload(cfg, []queueRecord{
		{
			metric:      domain.Metric{Name: "node.hostname", TextValue: "MSI", Unit: "text", SourceMetric: "windows_os_hostname", ScopeType: "node"},
			collectedAt: older,
		},
		{
			metric:      domain.Metric{Name: "node.os_product", TextValue: "Windows 11 Pro", Unit: "text", SourceMetric: "windows_os_info", ScopeType: "node"},
			collectedAt: newer,
		},
	}, 0, counter, sentAt, sender.PayloadContext{})

	if got := payload.Batch.CollectedAt; got != newer.In(vietnamLocation).Format(time.RFC3339) {
		t.Fatalf("expected batch collectedAt to use latest record timestamp, got %s", got)
	}
	if got := payload.Batch.SentAt; got != sentAt.In(vietnamLocation).Format(time.RFC3339) {
		t.Fatalf("expected batch sentAt to use send timestamp, got %s", got)
	}
	if got := payload.Batch.RecordCount; got != 3 {
		t.Fatalf("expected latest-collected payload to include heartbeat record, got %d metrics", got)
	}
}
