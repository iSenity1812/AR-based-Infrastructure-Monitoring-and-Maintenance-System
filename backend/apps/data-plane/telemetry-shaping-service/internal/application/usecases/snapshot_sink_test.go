package usecases

import (
	"context"
	"testing"
	"time"

	outboundredis "telemetry-shaping-service/internal/adapter/outbound/redis"
	"telemetry-shaping-service/internal/domain/entities"
)

func TestBuildSnapshotDocuments_GroupsByScope(t *testing.T) {
	batch := entities.LaneBatch{
		Lane:          entities.LaneNameSnapshot,
		AgentID:       "node-1",
		BatchSequence: 9,
		ReceivedAt:    time.Date(2026, 6, 24, 23, 11, 1, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			snapshotMetricForTest("node", "node-1", "node.cpu_usage_pct"),
			snapshotMetricForTest("node", "node-1", "node.memory_used_pct"),
			snapshotMetricForTest("container", "ctr-1", "container.cpu_usage_pct"),
		},
	}

	documents := buildSnapshotDocuments(batch)
	if got, want := len(documents), 2; got != want {
		t.Fatalf("document count mismatch: got %d want %d", got, want)
	}

	if got, want := documents[0].ScopeType, "container"; got != want {
		t.Fatalf("first scope type mismatch: got %s want %s", got, want)
	}

	if got, want := len(documents[0].Metrics), 1; got != want {
		t.Fatalf("container metric count mismatch: got %d want %d", got, want)
	}

	if got, want := documents[1].ScopeType, "node"; got != want {
		t.Fatalf("second scope type mismatch: got %s want %s", got, want)
	}

	if got, want := len(documents[1].Metrics), 2; got != want {
		t.Fatalf("node metric count mismatch: got %d want %d", got, want)
	}
}

func TestSnapshotSink_Handle_UpsertsLatestSnapshots(t *testing.T) {
	store := outboundredis.NewMemorySnapshotStore()
	sink := NewSnapshotSink(store)

	err := sink.Handle(context.Background(), entities.LaneBatch{
		Lane:          entities.LaneNameSnapshot,
		AgentID:       "node-1",
		BatchSequence: 9,
		Topic:         "telemetry.normalized.received",
		Partition:     0,
		Offset:        42,
		ReceivedAt:    time.Date(2026, 6, 24, 23, 11, 1, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			snapshotMetricForTest("node", "node-1", "node.cpu_usage_pct"),
			snapshotMetricForTest("node", "node-1", "node.memory_used_pct"),
			snapshotMetricForTest("container", "ctr-1", "container.cpu_usage_pct"),
		},
	})
	if err != nil {
		t.Fatalf("handle returned error: %v", err)
	}

	snapshots := store.ListSnapshots()
	if got, want := len(snapshots), 2; got != want {
		t.Fatalf("snapshot count mismatch: got %d want %d", got, want)
	}

	var nodeSnapshot entities.SnapshotDocument
	foundNode := false
	for _, snapshot := range snapshots {
		if snapshot.ScopeType == "node" && snapshot.ScopeID == "node-1" {
			nodeSnapshot = snapshot
			foundNode = true
			break
		}
	}
	if !foundNode {
		t.Fatal("expected node snapshot to be materialized")
	}

	if got, want := nodeSnapshot.ScopeID, "node-1"; got != want {
		t.Fatalf("node scope id mismatch: got %s want %s", got, want)
	}

	if got, want := len(nodeSnapshot.Metrics), 2; got != want {
		t.Fatalf("node snapshot metrics mismatch: got %d want %d", got, want)
	}

	if _, ok := nodeSnapshot.Metrics["node.cpu_usage_pct"]; !ok {
		t.Fatal("expected node.cpu_usage_pct in snapshot")
	}
}

func snapshotMetricForTest(scopeType, scopeID, metricKey string) entities.ClassifiedMetric {
	timestamp := time.Date(2026, 6, 24, 23, 11, 1, 0, time.UTC)
	return entities.ClassifiedMetric{
		Metric: entities.NormalizedMetric{
			AgentID:   "node-1",
			MetricKey: metricKey,
			ScopeType: scopeType,
			ScopeID:   scopeID,
			Source:    "windows_exporter",
			Timestamp: timestamp,
			Value:     entities.NewNumberMetricValue(1),
			Tags:      map[string]string{},
			SeriesKey: "node-1|" + scopeType + "|" + scopeID + "|" + metricKey,
		},
		Classification: entities.MetricClassification{
			Category: entities.MetricCategoryCompute,
			LaneMask: entities.LaneSnapshot,
		},
	}
}
