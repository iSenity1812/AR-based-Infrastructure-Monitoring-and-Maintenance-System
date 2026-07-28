package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
)

type mockTelemetryNodeRepo struct {
	node *domain.Node
	err  error
}

func (m *mockTelemetryNodeRepo) SaveNode(_ context.Context, node *domain.Node) error {
	_ = node
	return nil
}

func (m *mockTelemetryNodeRepo) FindNodeByAgentID(_ context.Context, agentID string) (*domain.Node, error) {
	_ = agentID
	return m.node, m.err
}

type mockTelemetryBroker struct {
	published *domain.TelemetryEnvelope
	err       error
}

func (m *mockTelemetryBroker) PublishTelemetryEnvelope(_ context.Context, envelope *domain.TelemetryEnvelope) error {
	m.published = envelope
	return m.err
}

func (m *mockTelemetryBroker) Close() error {
	return nil
}

type mockCollectorHeartbeatSync struct {
	signal *domain.CollectorHeartbeatSignal
	err    error
}

func (m *mockCollectorHeartbeatSync) SyncCollectorHeartbeat(_ context.Context, signal *domain.CollectorHeartbeatSignal) error {
	m.signal = signal
	return m.err
}

var _ port.NodeRepositoryPort = (*mockTelemetryNodeRepo)(nil)
var _ port.TelemetryBrokerPort = (*mockTelemetryBroker)(nil)

func TestIngestBatchRejectsUnassignedNodeBeforePublish(t *testing.T) {
	nodeRepo := &mockTelemetryNodeRepo{
		node: &domain.Node{
			AgentID:         "node-msi-838958db",
			AssignmentState: domain.AssignmentUnassigned,
		},
	}
	broker := &mockTelemetryBroker{}
	uc := NewTelemetryUseCase(nodeRepo, broker, nil)

	_, err := uc.IngestBatch(context.Background(), "CN=node-msi-838958db, OU=Telemetry, O=ExampleCorp", &domain.IngestBatchRequest{
		Batch: domain.BatchMeta{
			BatchID: "batch-001",
		},
	})
	if err == nil {
		t.Fatal("expected unassigned node to be rejected")
	}
	if broker.published != nil {
		t.Fatal("expected telemetry not to be published for unassigned node")
	}
}

func TestIngestBatchRejectsRetiredNodeBeforePublish(t *testing.T) {
	nodeRepo := &mockTelemetryNodeRepo{
		node: &domain.Node{
			AgentID:         "node-msi-838958db",
			LifecycleState:  domain.StateRetired,
			AssignmentState: domain.AssignmentAssigned,
		},
	}
	broker := &mockTelemetryBroker{}
	uc := NewTelemetryUseCase(nodeRepo, broker, nil)

	_, err := uc.IngestBatch(context.Background(), "CN=node-msi-838958db, OU=Telemetry, O=ExampleCorp", &domain.IngestBatchRequest{
		Batch: domain.BatchMeta{
			BatchID: "batch-001",
		},
	})
	if err == nil {
		t.Fatal("expected retired node to be rejected")
	}
	if broker.published != nil {
		t.Fatal("expected telemetry not to be published for retired node")
	}
}

func TestIngestBatchPublishesAssignedNode(t *testing.T) {
	fixedNow := time.Date(2026, 6, 29, 10, 52, 10, 300928001, time.UTC)
	nodeRepo := &mockTelemetryNodeRepo{
		node: &domain.Node{
			AgentID:         "node-msi-838958db",
			AssignmentState: domain.AssignmentAssigned,
		},
	}
	broker := &mockTelemetryBroker{}
	heartbeatSync := &mockCollectorHeartbeatSync{}
	uc := NewTelemetryUseCase(nodeRepo, broker, heartbeatSync)
	uc.nowFn = func() time.Time { return fixedNow }

	resp, err := uc.IngestBatch(context.Background(), "CN=node-msi-838958db, OU=Telemetry, O=ExampleCorp", &domain.IngestBatchRequest{
		Agent: domain.AgentMeta{
			AgentID: "node-msi-838958db",
		},
		Batch: domain.BatchMeta{
			BatchID:     "batch-001",
			CollectedAt: "2026-07-21T10:51:55Z",
		},
		Context: domain.PayloadContext{
			Identity: domain.ContextIdentity{
				NodeID: "node-msi-838958db",
			},
		},
		Metrics: []domain.MetricRecord{
			{
				MetricKey:    domain.AgentHeartbeatMetricKey,
				ScopeType:    "node",
				ScopeID:      "node-msi-838958db",
				Value:        1,
				Unit:         "state",
				Timestamp:    "2026-07-21T10:52:00Z",
				Source:       "go-agent-collector",
				SourceMetric: "collector.runtime.heartbeat",
			},
		},
	})
	if err != nil {
		t.Fatalf("expected assigned node to be accepted, got error: %v", err)
	}
	if resp == nil || !resp.Accepted {
		t.Fatal("expected accepted response")
	}
	if broker.published == nil {
		t.Fatal("expected telemetry to be published for assigned node")
	}
	if broker.published.AgentID != "node-msi-838958db" {
		t.Fatalf("expected agent id to be forwarded, got %q", broker.published.AgentID)
	}
	if got := resp.ReceivedAt; got != fixedNow.In(vietnamLocation).Format(time.RFC3339Nano) {
		t.Fatalf("expected receivedAt to be formatted in Vietnam time, got %q", got)
	}
	if got := broker.published.ReceivedAt; !got.Equal(fixedNow.In(vietnamLocation)) {
		t.Fatalf("expected envelope receivedAt to use Vietnam time, got %v", got)
	}
	if heartbeatSync.signal == nil {
		t.Fatal("expected collector heartbeat to be synced")
	}
	if heartbeatSync.signal.NodeID != "node-msi-838958db" {
		t.Fatalf("expected collector heartbeat node id to be forwarded, got %q", heartbeatSync.signal.NodeID)
	}
}

func TestIngestBatchFailsWhenNodeLookupFails(t *testing.T) {
	nodeRepo := &mockTelemetryNodeRepo{
		err: errors.New("redis down"),
	}
	broker := &mockTelemetryBroker{}
	uc := NewTelemetryUseCase(nodeRepo, broker, nil)

	_, err := uc.IngestBatch(context.Background(), "CN=node-msi-838958db, OU=Telemetry, O=ExampleCorp", &domain.IngestBatchRequest{
		Batch: domain.BatchMeta{
			BatchID: "batch-001",
		},
	})
	if err == nil {
		t.Fatal("expected lookup failure to be returned")
	}
	if broker.published != nil {
		t.Fatal("expected telemetry not to be published when lookup fails")
	}
}

func TestIngestBatchSkipsHeartbeatSyncWhenMetricIsAbsent(t *testing.T) {
	nodeRepo := &mockTelemetryNodeRepo{
		node: &domain.Node{
			AgentID:         "node-msi-838958db",
			AssignmentState: domain.AssignmentAssigned,
		},
	}
	broker := &mockTelemetryBroker{}
	heartbeatSync := &mockCollectorHeartbeatSync{}
	uc := NewTelemetryUseCase(nodeRepo, broker, heartbeatSync)

	_, err := uc.IngestBatch(context.Background(), "CN=node-msi-838958db, OU=Telemetry, O=ExampleCorp", &domain.IngestBatchRequest{
		Batch: domain.BatchMeta{
			BatchID: "batch-001",
		},
		Metrics: []domain.MetricRecord{
			{
				MetricKey: "system.cpu.usage",
				ScopeType: "node",
				ScopeID:   "node-msi-838958db",
			},
		},
	})
	if err != nil {
		t.Fatalf("expected assigned node telemetry to be accepted, got error: %v", err)
	}
	if heartbeatSync.signal != nil {
		t.Fatal("expected collector heartbeat sync to be skipped when heartbeat metric is absent")
	}
}
