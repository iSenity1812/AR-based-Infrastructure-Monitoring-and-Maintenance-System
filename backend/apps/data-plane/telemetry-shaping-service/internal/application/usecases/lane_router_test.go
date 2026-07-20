package usecases

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"telemetry-shaping-service/internal/application/dto"
	"telemetry-shaping-service/internal/domain/entities"
)

func TestDefaultLaneRouter_Route(t *testing.T) {
	router := NewDefaultLaneRouter()
	classified := entities.ClassifiedBatch{
		Batch: entities.NormalizedBatch{
			AgentID:       "node-1",
			MessageKey:    "message-1",
			Topic:         "telemetry.normalized.received",
			Partition:     0,
			Offset:        42,
			BatchSequence: 7,
		},
		Metrics: []entities.ClassifiedMetric{
			classifiedMetric("node.hostname", entities.LaneContext|entities.LaneSnapshot),
			classifiedMetric("node.cpu_usage_pct", entities.LaneDashboard|entities.LaneWindow|entities.LaneSnapshot),
			classifiedMetric("container.network_rx_bytes_sec", entities.LaneDashboard|entities.LaneWindow),
		},
	}

	routed := router.Route(classified)

	if routed.Context.Lane != entities.LaneNameContext {
		t.Fatalf("context lane mismatch: got %s", routed.Context.Lane)
	}

	if got, want := len(routed.Context.Metrics), 1; got != want {
		t.Fatalf("context metric count mismatch: got %d want %d", got, want)
	}

	if got, want := len(routed.Snapshot.Metrics), 2; got != want {
		t.Fatalf("snapshot metric count mismatch: got %d want %d", got, want)
	}

	if got, want := len(routed.Dashboard.Metrics), 2; got != want {
		t.Fatalf("dashboard metric count mismatch: got %d want %d", got, want)
	}

	if got, want := len(routed.Window.Metrics), 2; got != want {
		t.Fatalf("window metric count mismatch: got %d want %d", got, want)
	}
}

func TestDefaultLaneDispatcher_Dispatch_OrderAndSkipEmpty(t *testing.T) {
	recorder := &recordingLaneSink{}
	dispatcher := NewDefaultLaneDispatcher(recorder, recorder, recorder, recorder)

	err := dispatcher.Dispatch(context.Background(), entities.RoutedLaneBatch{
		Context:   entities.LaneBatch{Lane: entities.LaneNameContext, Metrics: []entities.ClassifiedMetric{classifiedMetric("node.hostname", entities.LaneContext)}},
		Snapshot:  entities.LaneBatch{Lane: entities.LaneNameSnapshot, Metrics: []entities.ClassifiedMetric{classifiedMetric("node.cpu_usage_pct", entities.LaneSnapshot)}},
		Dashboard: entities.LaneBatch{Lane: entities.LaneNameDashboard},
		Window:    entities.LaneBatch{Lane: entities.LaneNameWindow, Metrics: []entities.ClassifiedMetric{classifiedMetric("node.cpu_usage_pct", entities.LaneWindow)}},
	})
	if err != nil {
		t.Fatalf("dispatch returned error: %v", err)
	}

	want := []entities.LaneName{
		entities.LaneNameContext,
		entities.LaneNameSnapshot,
		entities.LaneNameWindow,
	}
	if !reflect.DeepEqual(recorder.lanes, want) {
		t.Fatalf("dispatch order mismatch: got %v want %v", recorder.lanes, want)
	}
}

func TestDefaultLaneDispatcher_Dispatch_Error(t *testing.T) {
	dispatcher := NewDefaultLaneDispatcher(
		&recordingLaneSink{},
		&recordingLaneSink{},
		&recordingLaneSink{err: errors.New("snapshot unavailable")},
		&recordingLaneSink{},
	)

	err := dispatcher.Dispatch(context.Background(), entities.RoutedLaneBatch{
		Snapshot: entities.LaneBatch{
			Lane:    entities.LaneNameSnapshot,
			Metrics: []entities.ClassifiedMetric{classifiedMetric("node.cpu_usage_pct", entities.LaneSnapshot)},
		},
	})
	if err == nil {
		t.Fatal("expected dispatch error")
	}

	if !errors.Is(err, ErrDispatchFailed) {
		t.Fatalf("expected ErrDispatchFailed, got %v", err)
	}
}

func TestTelemetryShapingSink_Handle_RetryOnDispatchFailure(t *testing.T) {
	sink := NewTelemetryShapingSink(
		&stubDecoder{batch: decodedBatchForTest()},
		&stubNormalizer{batch: normalizedBatchForTest()},
		&stubClassifier{batch: classifiedBatchForTest()},
		&stubRouter{batch: routedBatchForTest()},
		&stubDispatcher{err: errors.New("redis unavailable")},
	)

	result, err := sink.Handle(context.Background(), ingressEnvelopeForTest())
	if err == nil {
		t.Fatal("expected dispatch error")
	}

	if result.Disposition != DispositionRetry {
		t.Fatalf("disposition mismatch: got %s want %s", result.Disposition, DispositionRetry)
	}

	if result.Reason != "lane_dispatch_failed" {
		t.Fatalf("reason mismatch: got %s", result.Reason)
	}
}

type recordingLaneSink struct {
	lanes []entities.LaneName
	err   error
}

func (s *recordingLaneSink) Handle(_ context.Context, batch entities.LaneBatch) error {
	s.lanes = append(s.lanes, batch.Lane)
	return s.err
}

type stubDecoder struct {
	batch entities.DecodedBatch
	err   error
}

func (s *stubDecoder) Decode(_ []byte) (entities.DecodedBatch, error) {
	return s.batch, s.err
}

type stubNormalizer struct {
	batch entities.NormalizedBatch
	err   error
}

func (s *stubNormalizer) Normalize(_ entities.DecodedBatch) (entities.NormalizedBatch, error) {
	return s.batch, s.err
}

type stubClassifier struct {
	batch entities.ClassifiedBatch
}

func (s *stubClassifier) Classify(_ entities.NormalizedMetric) entities.MetricClassification {
	return entities.MetricClassification{}
}

func (s *stubClassifier) ClassifyBatch(_ entities.NormalizedBatch) entities.ClassifiedBatch {
	return s.batch
}

type stubRouter struct {
	batch entities.RoutedLaneBatch
}

func (s *stubRouter) Route(_ entities.ClassifiedBatch) entities.RoutedLaneBatch {
	return s.batch
}

type stubDispatcher struct {
	err error
}

func (s *stubDispatcher) Dispatch(_ context.Context, _ entities.RoutedLaneBatch) error {
	return s.err
}

func classifiedMetric(metricKey string, laneMask entities.LaneMask) entities.ClassifiedMetric {
	return entities.ClassifiedMetric{
		Metric: entities.NormalizedMetric{
			AgentID:   "node-1",
			MetricKey: metricKey,
			Timestamp: time.Unix(0, 0).UTC(),
			Value:     entities.NewNumberMetricValue(1),
			Tags:      map[string]string{},
			SeriesKey: "node-1|" + metricKey,
		},
		Classification: entities.MetricClassification{
			LaneMask: laneMask,
		},
	}
}

func decodedBatchForTest() entities.DecodedBatch {
	return entities.DecodedBatch{
		AgentID:    "node-1",
		MessageKey: "message-1",
		Metrics: []entities.DecodedMetricRecord{
			{MetricKey: "node.hostname", TimestampRaw: "2026-06-24T10:00:00Z", ValueRaw: "node-1"},
		},
	}
}

func normalizedBatchForTest() entities.NormalizedBatch {
	return entities.NormalizedBatch{
		AgentID:       "node-1",
		MessageKey:    "message-1",
		Topic:         "telemetry.normalized.received",
		Partition:     0,
		Offset:        42,
		BatchSequence: 7,
		Metrics: []entities.NormalizedMetric{
			{
				AgentID:   "node-1",
				MetricKey: "node.hostname",
				Timestamp: time.Unix(0, 0).UTC(),
				Value:     entities.NewTextMetricValue("node-1"),
				Tags:      map[string]string{},
				SeriesKey: "node-1|node.hostname",
			},
		},
		Report: entities.NormalizationReport{
			InputMetricCount:  1,
			OutputMetricCount: 1,
		},
	}
}

func classifiedBatchForTest() entities.ClassifiedBatch {
	normalized := normalizedBatchForTest()
	return entities.ClassifiedBatch{
		Batch: normalized,
		Metrics: []entities.ClassifiedMetric{
			{
				Metric: normalized.Metrics[0],
				Classification: entities.MetricClassification{
					Category:        entities.MetricCategoryIdentityAndInventory,
					LaneMask:        entities.LaneContext | entities.LaneSnapshot,
					FeatureEligible: false,
				},
			},
		},
	}
}

func routedBatchForTest() entities.RoutedLaneBatch {
	classified := classifiedBatchForTest()
	return entities.RoutedLaneBatch{
		Batch: classified,
		Context: entities.LaneBatch{
			Lane:    entities.LaneNameContext,
			AgentID: "node-1",
			Metrics: classified.Metrics,
		},
		Snapshot: entities.LaneBatch{
			Lane:    entities.LaneNameSnapshot,
			AgentID: "node-1",
			Metrics: classified.Metrics,
		},
	}
}

func ingressEnvelopeForTest() dto.IngressEnvelope {
	return dto.IngressEnvelope{
		Topic:      "telemetry.normalized.received",
		Partition:  0,
		Offset:     42,
		MessageKey: "message-1",
		AgentID:    "node-1",
		RawPayload: []byte(`{"agent_id":"node-1","message_key":"message-1","metrics":[{"metricKey":"node.hostname","timestamp":"2026-06-24T10:00:00Z","value":"node-1"}]}`),
		ReceivedAt: time.Now().UTC(),
	}
}
