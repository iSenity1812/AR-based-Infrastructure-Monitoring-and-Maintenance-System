package usecases

import (
	"context"
	"testing"
	"time"

	"telemetry-shaping-service/internal/domain/entities"
)

func TestDashboardSink_Handle_MapsSupportedMetricsByScope(t *testing.T) {
	store := &dashboardStoreSpy{}
	sink := NewDashboardSink(store)

	err := sink.Handle(context.Background(), entities.LaneBatch{
		AgentID:       "node-1",
		BatchSequence: 42,
		ReceivedAt:    time.Date(2026, 6, 25, 12, 0, 0, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			dashboardMetric("node", "node-1", "node.cpu_usage_pct", entities.NewNumberMetricValue(55.5)),
			dashboardMetric("node", "node-1", "node.network_rx_bytes_sec", entities.NewNumberMetricValue(1024)),
			dashboardMetric("container", "api-1", "container.status", entities.NewTextMetricValue("running")),
			dashboardMetric("container", "api-1", "container.cpu_usage_pct", entities.NewNumberMetricValue(12.5)),
			dashboardMetric("node", "node-1", "node.hostname", entities.NewTextMetricValue("ignored")),
		},
	})
	if err != nil {
		t.Fatalf("handle returned error: %v", err)
	}

	if got, want := len(store.documents), 2; got != want {
		t.Fatalf("dashboard document count mismatch: got %d want %d", got, want)
	}

	node := store.documents[0]
	if node.ScopeType != "node" {
		node = store.documents[1]
	}
	if got, want := len(node.Resources), 1; got != want {
		t.Fatalf("node resources count mismatch: got %d want %d", got, want)
	}
	if _, ok := node.Network["rx_bytes_sec"]; !ok {
		t.Fatal("expected node network rx field")
	}
	if _, ok := node.Resources["cpu_usage_pct"]; !ok {
		t.Fatal("expected node cpu usage field")
	}

	container := store.documents[0]
	if container.ScopeType != "container" {
		container = store.documents[1]
	}
	if _, ok := container.Status["status"]; !ok {
		t.Fatal("expected container status field")
	}
	if _, ok := container.Resources["cpu_usage_pct"]; !ok {
		t.Fatal("expected container cpu usage field")
	}
}

func TestDashboardSink_Handle_SkipsBatchWhenNothingMapped(t *testing.T) {
	store := &dashboardStoreSpy{}
	sink := NewDashboardSink(store)

	err := sink.Handle(context.Background(), entities.LaneBatch{
		AgentID: "node-1",
		Metrics: []entities.ClassifiedMetric{
			dashboardMetric("node", "node-1", "node.hostname", entities.NewTextMetricValue("host")),
		},
	})
	if err != nil {
		t.Fatalf("handle returned error: %v", err)
	}
	if got := len(store.documents); got != 0 {
		t.Fatalf("expected no dashboard documents, got %d", got)
	}
}

type dashboardStoreSpy struct {
	documents []entities.DashboardDocument
}

func (s *dashboardStoreSpy) UpsertDashboards(_ context.Context, documents []entities.DashboardDocument) error {
	s.documents = append([]entities.DashboardDocument(nil), documents...)
	return nil
}

func dashboardMetric(scopeType, scopeID, metricKey string, value entities.MetricValue) entities.ClassifiedMetric {
	return entities.ClassifiedMetric{
		Metric: entities.NormalizedMetric{
			AgentID:   "node-1",
			ScopeType: scopeType,
			ScopeID:   scopeID,
			MetricKey: metricKey,
			Source:    "windows_exporter",
			Unit:      "%",
			Timestamp: time.Date(2026, 6, 25, 12, 0, 0, 0, time.UTC),
			Value:     value,
		},
	}
}
