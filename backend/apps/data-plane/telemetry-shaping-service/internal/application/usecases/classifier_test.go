package usecases

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"telemetry-shaping-service/internal/domain/entities"
)

func TestRuleBasedMetricClassifier_Classify_TableMappings(t *testing.T) {
	classifier := NewRuleBasedMetricClassifier()

	tests := []struct {
		name            string
		metric          entities.NormalizedMetric
		wantCategory    entities.MetricCategory
		wantLaneMask    entities.LaneMask
		wantFeature     bool
		wantAggregation entities.AggregationHint
	}{
		{
			name:            "windows identity metric",
			metric:          normalizedMetric("windows_exporter", "node.hostname"),
			wantCategory:    entities.MetricCategoryIdentityAndInventory,
			wantLaneMask:    entities.LaneContext | entities.LaneSnapshot,
			wantFeature:     false,
			wantAggregation: entities.AggregationHint("direct"),
		},
		{
			name:            "windows capacity metric",
			metric:          normalizedMetric("windows_exporter", "node.memory_total_bytes"),
			wantCategory:    entities.MetricCategoryMemory,
			wantLaneMask:    entities.LaneContext | entities.LaneSnapshot,
			wantFeature:     false,
			wantAggregation: entities.AggregationHint("direct"),
		},
		{
			name:            "docker capacity metric",
			metric:          normalizedMetric("docker", "container.memory_limit_bytes"),
			wantCategory:    entities.MetricCategoryIdentityAndInventory,
			wantLaneMask:    entities.LaneContext | entities.LaneSnapshot,
			wantFeature:     false,
			wantAggregation: entities.AggregationHint("direct"),
		},
		{
			name:            "docker runtime state metric",
			metric:          normalizedMetric("docker", "container.status"),
			wantCategory:    entities.MetricCategoryRuntimeAndOS,
			wantLaneMask:    entities.LaneDashboard | entities.LaneSnapshot | entities.LaneContext,
			wantFeature:     false,
			wantAggregation: entities.AggregationHint("direct"),
		},
		{
			name:            "resource metric",
			metric:          normalizedMetric("windows_exporter", "node.cpu_usage_pct"),
			wantCategory:    entities.MetricCategoryCompute,
			wantLaneMask:    entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
			wantFeature:     true,
			wantAggregation: entities.AggregationHint("cpu_usage_from_idle"),
		},
		{
			name:            "throughput metric",
			metric:          normalizedMetric("windows_exporter", "node.network_rx_bytes_sec"),
			wantCategory:    entities.MetricCategoryNetwork,
			wantLaneMask:    entities.LaneDashboard | entities.LaneWindow,
			wantFeature:     true,
			wantAggregation: entities.AggregationHint("select_primary_nic_rate"),
		},
		{
			name:            "thermal metric",
			metric:          normalizedMetric("lhm", "node.cpu_temperature_c"),
			wantCategory:    entities.MetricCategoryHardwareHealth,
			wantLaneMask:    entities.LaneDashboard | entities.LaneWindow | entities.LaneSnapshot,
			wantFeature:     true,
			wantAggregation: entities.AggregationHint("direct"),
		},
		{
			name:            "inventory count metric",
			metric:          normalizedMetric("docker", "container.port_binding_count"),
			wantCategory:    entities.MetricCategoryInventoryCounts,
			wantLaneMask:    entities.LaneContext | entities.LaneSnapshot,
			wantFeature:     false,
			wantAggregation: entities.AggregationHint("direct"),
		},
		{
			name:            "ssd lifetime counter",
			metric:          normalizedMetric("lhm", "node.ssd_data_read_gb"),
			wantCategory:    entities.MetricCategoryHardwareHealth,
			wantLaneMask:    entities.LaneSnapshot,
			wantFeature:     false,
			wantAggregation: entities.AggregationHint("direct"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := classifier.Classify(tt.metric)

			if got.Category != tt.wantCategory {
				t.Fatalf("category mismatch: got %s want %s", got.Category, tt.wantCategory)
			}

			if got.LaneMask != tt.wantLaneMask {
				t.Fatalf("lane mask mismatch: got %b want %b", got.LaneMask, tt.wantLaneMask)
			}

			if got.FeatureEligible != tt.wantFeature {
				t.Fatalf("feature eligibility mismatch: got %t want %t", got.FeatureEligible, tt.wantFeature)
			}

			if got.AggregationHint != tt.wantAggregation {
				t.Fatalf("aggregation hint mismatch: got %s want %s", got.AggregationHint, tt.wantAggregation)
			}
		})
	}
}

func TestRuleBasedMetricClassifier_Classify_UnknownFallback(t *testing.T) {
	classifier := NewRuleBasedMetricClassifier()

	got := classifier.Classify(entities.NormalizedMetric{
		Source:    "unknown_source",
		MetricKey: "custom.metric.key",
	})

	if got.Category != entities.MetricCategoryUnknown {
		t.Fatalf("category mismatch: got %s want %s", got.Category, entities.MetricCategoryUnknown)
	}

	if got.LaneMask != entities.LaneSnapshot {
		t.Fatalf("lane mask mismatch: got %b want %b", got.LaneMask, entities.LaneSnapshot)
	}

	if got.FeatureEligible {
		t.Fatalf("feature eligibility mismatch: got %t want false", got.FeatureEligible)
	}
}

func TestRuleBasedMetricClassifier_ClassifyBatch_DoesNotMutateBatch(t *testing.T) {
	classifier := NewRuleBasedMetricClassifier()
	normalized := entities.NormalizedBatch{
		AgentID:    "node-msi-8bc4df0d",
		MessageKey: "message-1",
		Topic:      "telemetry.normalized.received",
		Metrics: []entities.NormalizedMetric{
			normalizedMetric("windows_exporter", "node.hostname"),
			normalizedMetric("docker", "container.cpu_usage_pct"),
		},
	}

	got := classifier.ClassifyBatch(normalized)

	if !reflect.DeepEqual(got.Batch, normalized) {
		t.Fatalf("normalized batch changed after classification")
	}

	if len(got.Metrics) != len(normalized.Metrics) {
		t.Fatalf("classified metric count mismatch: got %d want %d", len(got.Metrics), len(normalized.Metrics))
	}

	if got.Metrics[0].Metric.MetricKey != normalized.Metrics[0].MetricKey {
		t.Fatalf("metric key changed: got %s want %s", got.Metrics[0].Metric.MetricKey, normalized.Metrics[0].MetricKey)
	}
}

func TestRuleBasedMetricClassifier_ClassifyFixture_CoversKnownKeys(t *testing.T) {
	fixturePath := filepath.Join("..", "..", "..", "..", "..", "..", "..", "playground", "go-agent-collector", "docs", "vector_normalized.json")

	payload, err := os.ReadFile(fixturePath)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	var raw rawTelemetryBatch
	if err := json.Unmarshal(payload, &raw); err != nil {
		t.Fatalf("unmarshal fixture: %v", err)
	}

	if raw.AgentID == "" || raw.MessageKey == "" || len(raw.Metrics) == 0 {
		t.Fatalf("fixture is missing required batch fields")
	}

	decoder := NewTelemetryBatchDecoder()
	decoded, err := decoder.Decode(payload)
	if err != nil {
		t.Fatalf("decode fixture: %v", err)
	}

	normalizer := NewBatchNormalizer()
	normalized, err := normalizer.Normalize(decoded)
	if err != nil {
		t.Fatalf("normalize fixture: %v", err)
	}

	classifier := NewRuleBasedMetricClassifier()
	classified := classifier.ClassifyBatch(normalized)

	if len(classified.Metrics) != len(normalized.Metrics) {
		t.Fatalf("classified metric count mismatch: got %d want %d", len(classified.Metrics), len(normalized.Metrics))
	}

	unknownKeys := make([]string, 0)
	for _, item := range classified.Metrics {
		if item.Classification.Category == entities.MetricCategoryUnknown {
			unknownKeys = append(unknownKeys, item.Metric.MetricKey)
		}
	}

	if len(unknownKeys) > 0 {
		t.Fatalf("fixture still routes to unknown for keys: %v", uniqueStrings(unknownKeys))
	}
}

func normalizedMetric(source, metricKey string) entities.NormalizedMetric {
	return entities.NormalizedMetric{
		AgentID:   "node-msi-8bc4df0d",
		MetricKey: metricKey,
		Source:    source,
		SeriesKey: source + "|" + metricKey,
		Timestamp: time.Unix(0, 0).UTC(),
		Value:     entities.NewNumberMetricValue(1),
		Tags:      map[string]string{},
	}
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	unique := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		unique = append(unique, value)
	}
	return unique
}
