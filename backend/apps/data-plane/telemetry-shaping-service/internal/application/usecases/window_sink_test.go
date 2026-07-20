package usecases

import (
	"context"
	"testing"
	"time"

	outboundredis "telemetry-shaping-service/internal/adapter/outbound/redis"
	"telemetry-shaping-service/internal/domain/entities"
)

func TestBuildWindowSeries_GroupsBySeriesKey(t *testing.T) {
	batch := entities.LaneBatch{
		Lane:          entities.LaneNameWindow,
		AgentID:       "node-1",
		BatchSequence: 10,
		ReceivedAt:    time.Date(2026, 6, 25, 0, 0, 0, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			windowMetricForTest("node-1|node.cpu_usage_pct", "node.cpu_usage_pct", true),
			windowMetricForTest("node-1|node.cpu_usage_pct", "node.cpu_usage_pct", true),
			windowMetricForTest("node-1|node.memory_used_pct", "node.memory_used_pct", true),
			windowMetricForTest("node-1|node.hostname", "node.hostname", false),
		},
	}

	series := buildWindowSeries(batch)
	if got, want := len(series), 2; got != want {
		t.Fatalf("series count mismatch: got %d want %d", got, want)
	}

	if got, want := series[0].MetricKey, "node.cpu_usage_pct"; got != want {
		t.Fatalf("first metric key mismatch: got %s want %s", got, want)
	}

	if got, want := len(series[0].Points), 2; got != want {
		t.Fatalf("cpu series point count mismatch: got %d want %d", got, want)
	}
}

func TestWindowSink_Handle_UpsertsAndTrimsPoints(t *testing.T) {
	store := outboundredis.NewMemoryWindowStore()
	sink := NewWindowSink(store, 2)

	firstBatch := entities.LaneBatch{
		Lane:          entities.LaneNameWindow,
		AgentID:       "node-1",
		BatchSequence: 10,
		Topic:         "telemetry.normalized.received",
		Partition:     0,
		Offset:        50,
		ReceivedAt:    time.Date(2026, 6, 25, 0, 0, 0, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			windowMetricForTest("node-1|node.cpu_usage_pct", "node.cpu_usage_pct", true),
		},
	}

	secondBatch := entities.LaneBatch{
		Lane:          entities.LaneNameWindow,
		AgentID:       "node-1",
		BatchSequence: 11,
		Topic:         "telemetry.normalized.received",
		Partition:     0,
		Offset:        51,
		ReceivedAt:    time.Date(2026, 6, 25, 0, 0, 5, 0, time.UTC),
		Metrics: []entities.ClassifiedMetric{
			windowMetricForTest("node-1|node.cpu_usage_pct", "node.cpu_usage_pct", true),
			windowMetricForTest("node-1|node.cpu_usage_pct", "node.cpu_usage_pct", true),
		},
	}

	if err := sink.Handle(context.Background(), firstBatch); err != nil {
		t.Fatalf("handle first batch: %v", err)
	}
	if err := sink.Handle(context.Background(), secondBatch); err != nil {
		t.Fatalf("handle second batch: %v", err)
	}

	series := store.ListWindowSeries()
	if got, want := len(series), 1; got != want {
		t.Fatalf("window series count mismatch: got %d want %d", got, want)
	}

	if got, want := len(series[0].Points), 2; got != want {
		t.Fatalf("window point count mismatch: got %d want %d", got, want)
	}

	if got, want := series[0].BatchSequence, int64(11); got != want {
		t.Fatalf("batch sequence mismatch: got %d want %d", got, want)
	}
}

func windowMetricForTest(seriesKey, metricKey string, featureEligible bool) entities.ClassifiedMetric {
	timestamp := time.Date(2026, 6, 25, 0, 0, 0, 0, time.UTC)
	return entities.ClassifiedMetric{
		Metric: entities.NormalizedMetric{
			AgentID:   "node-1",
			MetricKey: metricKey,
			ScopeType: "node",
			ScopeID:   "node-1",
			Source:    "windows_exporter",
			Unit:      "percent",
			Timestamp: timestamp,
			Value:     entities.NewNumberMetricValue(1),
			Tags:      map[string]string{},
			SeriesKey: seriesKey,
		},
		Classification: entities.MetricClassification{
			Category:        entities.MetricCategoryCompute,
			LaneMask:        entities.LaneWindow,
			FeatureEligible: featureEligible,
			AggregationHint: entities.AggregationHint("direct"),
		},
	}
}
