package usecases

import (
	"context"
	"testing"
	"time"

	outboundredis "telemetry-shaping-service/internal/adapter/outbound/redis"
	"telemetry-shaping-service/internal/domain/entities"
)

func TestContextSinkBuildContextDocuments_MapsAndFallsBack(t *testing.T) {
	sink := NewContextSink(outboundredis.NewMemoryContextStore())
	batch := entities.LaneBatch{
		Lane:          entities.LaneNameContext,
		AgentID:       "node-1",
		BatchSequence: 12,
		ReceivedAt:    time.Date(2026, 6, 25, 10, 0, 0, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			contextMetricForTest("node", "node-1", "node.hostname", entities.NewTextMetricValue("MSI")),
			contextMetricForTest("node", "node-1", "node.memory_total_bytes", entities.NewNumberMetricValue(16)),
			contextMetricForTest("node", "node-1", "node.unmapped_identity_hint", entities.NewTextMetricValue("x")),
			contextMetricForTest("container", "ctr-1", "container.image", entities.NewTextMetricValue("nginx")),
			contextMetricForTest("container", "ctr-1", "container.service_name", entities.NewTextMetricValue("web")),
		},
	}

	documents := sink.buildContextDocuments(batch)
	if got, want := len(documents), 2; got != want {
		t.Fatalf("context document count mismatch: got %d want %d", got, want)
	}

	nodeDocument := documents[1]
	if got, want := len(nodeDocument.Identity), 1; got != want {
		t.Fatalf("node identity count mismatch: got %d want %d", got, want)
	}
	if got, want := len(nodeDocument.Capacity), 1; got != want {
		t.Fatalf("node capacity count mismatch: got %d want %d", got, want)
	}
	if got, want := len(nodeDocument.Attributes), 1; got != want {
		t.Fatalf("node attributes count mismatch: got %d want %d", got, want)
	}
	if _, ok := nodeDocument.Identity["hostname"]; !ok {
		t.Fatal("expected hostname field in identity section")
	}

	containerDocument := documents[0]
	if _, ok := containerDocument.Identity["image"]; !ok {
		t.Fatal("expected image field in container identity section")
	}
	if _, ok := containerDocument.Relations["service_name"]; !ok {
		t.Fatal("expected service_name field in container relations section")
	}
}

func TestContextSinkHandle_UpsertsAndGuardsOlderBatch(t *testing.T) {
	store := outboundredis.NewMemoryContextStore()
	sink := NewContextSink(store)

	newerBatch := entities.LaneBatch{
		Lane:          entities.LaneNameContext,
		AgentID:       "node-1",
		BatchSequence: 12,
		Topic:         "telemetry.normalized.received",
		Partition:     0,
		Offset:        101,
		ReceivedAt:    time.Date(2026, 6, 25, 10, 0, 0, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			contextMetricForTest("node", "node-1", "node.hostname", entities.NewTextMetricValue("MSI-New")),
		},
	}

	olderBatch := entities.LaneBatch{
		Lane:          entities.LaneNameContext,
		AgentID:       "node-1",
		BatchSequence: 11,
		Topic:         "telemetry.normalized.received",
		Partition:     0,
		Offset:        100,
		ReceivedAt:    time.Date(2026, 6, 25, 9, 59, 0, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			contextMetricForTest("node", "node-1", "node.hostname", entities.NewTextMetricValue("MSI-Old")),
		},
	}

	if err := sink.Handle(context.Background(), newerBatch); err != nil {
		t.Fatalf("handle newer batch: %v", err)
	}
	if err := sink.Handle(context.Background(), olderBatch); err != nil {
		t.Fatalf("handle older batch: %v", err)
	}

	contexts := store.ListContexts()
	if got, want := len(contexts), 1; got != want {
		t.Fatalf("context count mismatch: got %d want %d", got, want)
	}

	value := contexts[0].Identity["hostname"]
	if value.Value.Text == nil || *value.Value.Text != "MSI-New" {
		t.Fatalf("expected newer hostname to remain after older batch replay")
	}
}

func contextMetricForTest(
	scopeType string,
	scopeID string,
	metricKey string,
	value entities.MetricValue,
) entities.ClassifiedMetric {
	timestamp := time.Date(2026, 6, 25, 10, 0, 0, 0, time.UTC)
	return entities.ClassifiedMetric{
		Metric: entities.NormalizedMetric{
			AgentID:   "node-1",
			MetricKey: metricKey,
			ScopeType: scopeType,
			ScopeID:   scopeID,
			Source:    "windows_exporter",
			Unit:      "text",
			Timestamp: timestamp,
			Value:     value,
			Tags:      map[string]string{},
			SeriesKey: "node-1|" + scopeType + "|" + scopeID + "|" + metricKey,
		},
		Classification: entities.MetricClassification{
			Category: entities.MetricCategoryIdentityAndInventory,
			LaneMask: entities.LaneContext,
		},
	}
}
