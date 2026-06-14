package backend

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestIngestStoresBatchAndStats(t *testing.T) {
	s := NewServer(nil, "")
	s.nowFn = func() time.Time {
		return time.Date(2026, 5, 28, 13, 0, 0, 0, time.UTC)
	}

	body, _ := json.Marshal(Payload{
		Agent: AgentMeta{AgentID: "agent-1", Hostname: "host-1"},
		Batch: BatchMeta{BatchID: "batch-1", RecordCount: 2},
		Context: PayloadContext{
			Identity:            ContextIdentity{Hostname: "host-1", NodeID: "node-1", Source: "multi_source", DeviceType: "laptop"},
			HardwareFingerprint: HardwareFingerprint{PrimaryIPv4: "10.10.9.11", MACAddress: "94:E9:79:A1:B2:C3"},
		},
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
	if batches[0].Context.Identity.NodeID != "node-1" || batches[0].Context.HardwareFingerprint.PrimaryIPv4 != "10.10.9.11" {
		t.Fatalf("expected summary to preserve shared context, got %#v", batches[0].Context)
	}
	if batches[0].Metrics[0].Value != nil {
		// ok to be nil here because this test only asserts the payload is preserved.
	}
}

func TestFailModeReturnsConfiguredError(t *testing.T) {
	s := NewServer(nil, "")
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

func TestGRPCIngestPublishesEnvelopeWithoutParsingBusinessPayload(t *testing.T) {
	publisher := &mockPublisher{}
	s := NewServer(publisher, "telemetry.grpc.raw")
	s.nowFn = func() time.Time {
		return time.Date(2026, 5, 28, 13, 5, 0, 0, time.UTC)
	}

	resp, err := s.HandleGRPCIngest(context.Background(), &GRPCIngestRequest{
		SchemaVersion: "v1",
		AgentID:       "agent-1",
		AgentName:     "agent-name",
		BatchID:       "batch-grpc-1",
		RecordCount:   2,
		DroppedCount:  1,
		SentAt:        "2026-05-28T13:04:55Z",
		ContentType:   "application/json",
		Encoding:      "json",
		PayloadBytes:  []byte(`{"schemaVersion":"v1","agent":{"agentId":"agent-1","agentName":"agent-name","sourceType":"multi_source","hostname":"host-1"},"batch":{"batchId":"batch-grpc-1","recordCount":2,"droppedCount":1},"context":{"identity":{"hostname":"host-1","nodeId":"node-1","source":"multi_source","deviceType":"laptop"},"hardwareFingerprint":{"primaryIpv4":"10.10.9.11","macAddress":"94:E9:79:A1:B2:C3","hardwareSerial":"SERIAL-123","osProduct":"Windows 11 Pro","logicalCpuCount":"16","cpuArchitecture":"x86_64"}},"metrics":[{"metricKey":"node.cpu_usage_pct","scopeType":"node","scopeId":"node-1","value":1,"unit":"%","timestamp":"2026-05-28T13:04:55Z","source":"windows_exporter","sourceMetric":"windows_cpu_time_total"}]}`),
	})
	if err != nil {
		t.Fatalf("expected grpc ingest to succeed, got %v", err)
	}
	if resp.Status != "accepted" {
		t.Fatalf("expected accepted response, got %#v", resp)
	}
	if publisher.last.BatchID != "batch-grpc-1" {
		t.Fatalf("expected batch to be published, got %#v", publisher.last)
	}

	batches := s.store.batchList(1)
	if len(batches) != 1 {
		t.Fatalf("expected 1 batch summary, got %d", len(batches))
	}
	if batches[0].Transport != "grpc" {
		t.Fatalf("expected grpc transport summary, got %#v", batches[0])
	}
	if batches[0].PublishedTo != "telemetry.grpc.raw" {
		t.Fatalf("expected published topic, got %#v", batches[0])
	}
	if batches[0].Context.Identity.NodeID != "node-1" || batches[0].Context.HardwareFingerprint.HardwareSerial != "SERIAL-123" {
		t.Fatalf("expected grpc summary to decode shared context, got %#v", batches[0].Context)
	}
}

type mockPublisher struct {
	last TransportEnvelope
}

func (m *mockPublisher) Publish(_ context.Context, envelope TransportEnvelope) error {
	m.last = envelope
	return nil
}

func (m *mockPublisher) Close() {}
