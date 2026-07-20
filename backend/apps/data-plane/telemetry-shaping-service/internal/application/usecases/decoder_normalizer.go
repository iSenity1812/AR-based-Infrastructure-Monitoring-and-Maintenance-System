package usecases

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"telemetry-shaping-service/internal/application/dto"
	"telemetry-shaping-service/internal/domain/entities"
)

var ErrDecodeFailed = errors.New("decode failed")
var ErrNormalizeFailed = errors.New("normalize failed")

type Decoder interface {
	Decode(payload []byte) (entities.DecodedBatch, error)
}

type Normalizer interface {
	Normalize(batch entities.DecodedBatch) (entities.NormalizedBatch, error)
}

// TelemetryShapingSink decodes, normalizes, and classifies telemetry before it
// is handed off to downstream lanes.
type TelemetryShapingSink struct {
	decoder    Decoder
	normalizer Normalizer
	classifier MetricClassifier
	router     LaneRouter
	dispatcher LaneDispatcher
}

func NewTelemetryShapingSink(
	decoder Decoder,
	normalizer Normalizer,
	classifier MetricClassifier,
	router LaneRouter,
	dispatcher LaneDispatcher,
) *TelemetryShapingSink {
	return &TelemetryShapingSink{
		decoder:    decoder,
		normalizer: normalizer,
		classifier: classifier,
		router:     router,
		dispatcher: dispatcher,
	}
}

func (s *TelemetryShapingSink) Handle(
	ctx context.Context,
	envelope dto.IngressEnvelope,
) (HandoffResult, error) {
	decoded, err := s.decoder.Decode(envelope.RawPayload)
	if err != nil {
		return HandoffResult{
			Disposition: DispositionCommit,
			Reason:      "decode_failed",
		}, errors.Join(ErrPoisonMessage, err)
	}

	decoded.Topic = envelope.Topic
	decoded.Partition = envelope.Partition
	decoded.Offset = envelope.Offset
	decoded.ReceivedAt = envelope.ReceivedAt

	normalized, err := s.normalizer.Normalize(decoded)
	if err != nil {
		return HandoffResult{
			Disposition: DispositionCommit,
			Reason:      "normalize_failed",
		}, errors.Join(ErrPoisonMessage, err)
	}

	classified := s.classifier.ClassifyBatch(normalized)
	routed := s.router.Route(classified)
	categorySummary := formatCategoryCounts(classified)
	laneSummary := formatLaneCounts(classified)
	featureEligibleCount := countFeatureEligible(classified)

	log.Printf(
		"classified handoff topic=%s partition=%d offset=%d agent_id=%s batch_sequence=%d input_metric_count=%d output_metric_count=%d classified_metric_count=%d feature_eligible_count=%d dropped_metric_count=%d categories=%s lanes=%s",
		classified.Batch.Topic,
		classified.Batch.Partition,
		classified.Batch.Offset,
		classified.Batch.AgentID,
		classified.Batch.BatchSequence,
		classified.Batch.Report.InputMetricCount,
		classified.Batch.Report.OutputMetricCount,
		len(classified.Metrics),
		featureEligibleCount,
		classified.Batch.Report.DroppedMetricCount,
		categorySummary,
		laneSummary,
	)

	if err := s.dispatcher.Dispatch(ctx, routed); err != nil {
		return HandoffResult{
			Disposition: DispositionRetry,
			Reason:      "lane_dispatch_failed",
		}, err
	}

	return HandoffResult{
		Disposition: DispositionCommit,
		Reason:      "lane_dispatch_accepted",
	}, nil
}

type TelemetryBatchDecoder struct{}

func NewTelemetryBatchDecoder() *TelemetryBatchDecoder {
	return &TelemetryBatchDecoder{}
}

type rawTelemetryBatch struct {
	AgentID             string            `json:"agent_id"`
	BatchRecordCount    int               `json:"batch_record_count"`
	BatchSequence       int64             `json:"batch_sequence"`
	HardwareFingerprint map[string]any    `json:"hardware_fingerprint"`
	Headers             map[string]string `json:"headers"`
	MessageKey          string            `json:"message_key"`
	Metrics             []rawMetricRecord `json:"metrics"`
	Offset              int64             `json:"offset"`
	Partition           int32             `json:"partition"`
	ReceivedAtRaw       string            `json:"received_at"`
	SourceType          string            `json:"source_type"`
	TimestampRaw        string            `json:"timestamp"`
	Topic               string            `json:"topic"`
}

type rawMetricRecord struct {
	MetricKey    string         `json:"metricKey"`
	ScopeID      string         `json:"scopeId"`
	ScopeType    string         `json:"scopeType"`
	Source       string         `json:"source"`
	SourceMetric string         `json:"sourceMetric"`
	Tags         map[string]any `json:"tags"`
	Timestamp    string         `json:"timestamp"`
	Unit         string         `json:"unit"`
	Value        any            `json:"value"`
}

func (d *TelemetryBatchDecoder) Decode(payload []byte) (entities.DecodedBatch, error) {
	var raw rawTelemetryBatch
	if err := json.Unmarshal(payload, &raw); err != nil {
		return entities.DecodedBatch{}, errors.Join(ErrDecodeFailed, fmt.Errorf("invalid json payload: %w", err))
	}

	if strings.TrimSpace(raw.AgentID) == "" {
		return entities.DecodedBatch{}, errors.Join(ErrDecodeFailed, errors.New("agent_id is missing"))
	}

	if strings.TrimSpace(raw.MessageKey) == "" {
		return entities.DecodedBatch{}, errors.Join(ErrDecodeFailed, errors.New("message_key is missing"))
	}

	if len(raw.Metrics) == 0 {
		return entities.DecodedBatch{}, errors.Join(ErrDecodeFailed, errors.New("metrics array is empty"))
	}

	receivedAt := time.Time{}
	if raw.ReceivedAtRaw != "" {
		parsed, err := time.Parse(time.RFC3339Nano, raw.ReceivedAtRaw)
		if err != nil {
			return entities.DecodedBatch{}, errors.Join(ErrDecodeFailed, fmt.Errorf("parse received_at: %w", err))
		}
		receivedAt = parsed.UTC()
	}

	metrics := make([]entities.DecodedMetricRecord, 0, len(raw.Metrics))
	for _, metric := range raw.Metrics {
		metrics = append(metrics, entities.DecodedMetricRecord{
			MetricKey:    strings.TrimSpace(metric.MetricKey),
			ScopeID:      strings.TrimSpace(metric.ScopeID),
			ScopeType:    strings.TrimSpace(metric.ScopeType),
			Source:       strings.TrimSpace(metric.Source),
			SourceMetric: strings.TrimSpace(metric.SourceMetric),
			TimestampRaw: strings.TrimSpace(metric.Timestamp),
			Unit:         strings.TrimSpace(metric.Unit),
			Tags:         stringifyMap(metric.Tags),
			ValueRaw:     metric.Value,
		})
	}

	return entities.DecodedBatch{
		AgentID:             strings.TrimSpace(raw.AgentID),
		MessageKey:          strings.TrimSpace(raw.MessageKey),
		SourceType:          strings.TrimSpace(raw.SourceType),
		Topic:               strings.TrimSpace(raw.Topic),
		Partition:           raw.Partition,
		Offset:              raw.Offset,
		ReceivedAt:          receivedAt,
		BatchSequence:       raw.BatchSequence,
		BatchRecordCount:    raw.BatchRecordCount,
		HardwareFingerprint: stringifyMap(raw.HardwareFingerprint),
		Headers:             raw.Headers,
		Metrics:             metrics,
	}, nil
}

type BatchNormalizer struct{}

func NewBatchNormalizer() *BatchNormalizer {
	return &BatchNormalizer{}
}

func (n *BatchNormalizer) Normalize(batch entities.DecodedBatch) (entities.NormalizedBatch, error) {
	normalizedMetrics := make([]entities.NormalizedMetric, 0, len(batch.Metrics))
	report := entities.NormalizationReport{
		InputMetricCount: len(batch.Metrics),
		DroppedMetrics:   make([]entities.DroppedMetric, 0),
	}

	for _, metric := range batch.Metrics {
		normalizedMetric, err := normalizeMetric(batch.AgentID, metric)
		if err != nil {
			report.DroppedMetricCount++
			report.DroppedMetrics = append(report.DroppedMetrics, entities.DroppedMetric{
				MetricKey: metric.MetricKey,
				Reason:    err.Error(),
			})
			continue
		}

		normalizedMetrics = append(normalizedMetrics, normalizedMetric)
	}

	report.OutputMetricCount = len(normalizedMetrics)
	if report.OutputMetricCount == 0 {
		return entities.NormalizedBatch{}, errors.Join(
			ErrNormalizeFailed,
			errors.New("no metrics survived normalization"),
		)
	}

	return entities.NormalizedBatch{
		AgentID:             batch.AgentID,
		MessageKey:          batch.MessageKey,
		SourceType:          batch.SourceType,
		Topic:               batch.Topic,
		Partition:           batch.Partition,
		Offset:              batch.Offset,
		ReceivedAt:          batch.ReceivedAt,
		BatchSequence:       batch.BatchSequence,
		BatchRecordCount:    batch.BatchRecordCount,
		HardwareFingerprint: batch.HardwareFingerprint,
		Headers:             batch.Headers,
		Metrics:             normalizedMetrics,
		Report:              report,
	}, nil
}

func normalizeMetric(agentID string, metric entities.DecodedMetricRecord) (entities.NormalizedMetric, error) {
	timestamp, err := parseMetricTimestamp(metric.TimestampRaw)
	if err != nil {
		return entities.NormalizedMetric{}, fmt.Errorf("parse timestamp for %s: %w", metric.MetricKey, err)
	}

	value, err := normalizeValue(metric)
	if err != nil {
		return entities.NormalizedMetric{}, err
	}

	tags := canonicalTags(metric.Tags)
	seriesKey := buildSeriesKey(agentID, metric, tags)

	return entities.NormalizedMetric{
		AgentID:      agentID,
		MetricKey:    metric.MetricKey,
		ScopeID:      metric.ScopeID,
		ScopeType:    metric.ScopeType,
		Source:       metric.Source,
		SourceMetric: metric.SourceMetric,
		Timestamp:    timestamp.UTC(),
		Unit:         metric.Unit,
		Tags:         tags,
		Value:        value,
		SeriesKey:    seriesKey,
	}, nil
}

func parseMetricTimestamp(raw string) (time.Time, error) {
	candidates := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.000",
		"2006-01-02T15:04:05",
	}

	trimmed := strings.TrimSpace(raw)
	for _, layout := range candidates {
		timestamp, err := time.Parse(layout, trimmed)
		if err == nil {
			return timestamp.UTC(), nil
		}
	}

	return time.Time{}, fmt.Errorf("unsupported timestamp format: %s", raw)
}

func normalizeValue(metric entities.DecodedMetricRecord) (entities.MetricValue, error) {
	switch value := metric.ValueRaw.(type) {
	case nil:
		return entities.NewNullMetricValue(), nil
	case bool:
		return entities.NewBoolMetricValue(value), nil
	case float64:
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return entities.MetricValue{}, fmt.Errorf("metric %s has unsupported numeric value", metric.MetricKey)
		}
		return entities.NewNumberMetricValue(value), nil
	case json.Number:
		parsed, err := value.Float64()
		if err != nil {
			return entities.MetricValue{}, fmt.Errorf("metric %s has invalid numeric value: %w", metric.MetricKey, err)
		}
		return entities.NewNumberMetricValue(parsed), nil
	case string:
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return entities.NewTextMetricValue(""), nil
		}

		if parsed, err := strconv.ParseFloat(trimmed, 64); err == nil {
			return entities.NewNumberMetricValue(parsed), nil
		}

		if parsedBool, err := strconv.ParseBool(trimmed); err == nil {
			return entities.NewBoolMetricValue(parsedBool), nil
		}

		return entities.NewTextMetricValue(trimmed), nil
	default:
		return entities.MetricValue{}, fmt.Errorf("metric %s has unsupported value type %T", metric.MetricKey, value)
	}
}

func canonicalTags(tags map[string]string) map[string]string {
	if len(tags) == 0 {
		return map[string]string{}
	}

	keys := make([]string, 0, len(tags))
	for key := range tags {
		if strings.TrimSpace(key) == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	canonical := make(map[string]string, len(keys))
	for _, key := range keys {
		value := strings.TrimSpace(tags[key])
		if value == "" {
			continue
		}
		canonical[key] = value
	}

	return canonical
}

func buildSeriesKey(agentID string, metric entities.DecodedMetricRecord, tags map[string]string) string {
	keys := make([]string, 0, len(tags))
	for key := range tags {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var builder strings.Builder
	builder.Grow(len(agentID) + len(metric.MetricKey) + len(metric.ScopeType) + len(metric.ScopeID) + len(metric.Source) + len(metric.SourceMetric) + len(keys)*16)
	builder.WriteString(agentID)
	builder.WriteByte('|')
	builder.WriteString(metric.MetricKey)
	builder.WriteByte('|')
	builder.WriteString(metric.ScopeType)
	builder.WriteByte('|')
	builder.WriteString(metric.ScopeID)
	builder.WriteByte('|')
	builder.WriteString(metric.Source)
	builder.WriteByte('|')
	builder.WriteString(metric.SourceMetric)

	for _, key := range keys {
		builder.WriteByte('|')
		builder.WriteString(key)
		builder.WriteByte('=')
		builder.WriteString(tags[key])
	}

	return builder.String()
}

func stringifyMap(input map[string]any) map[string]string {
	if len(input) == 0 {
		return map[string]string{}
	}

	result := make(map[string]string, len(input))
	for key, value := range input {
		if strings.TrimSpace(key) == "" {
			continue
		}
		if value == nil {
			continue
		}
		result[key] = fmt.Sprint(value)
	}

	return result
}

func formatCategoryCounts(batch entities.ClassifiedBatch) string {
	counts := make(map[entities.MetricCategory]int)
	for _, item := range batch.Metrics {
		counts[item.Classification.Category]++
	}

	keys := make([]string, 0, len(counts))
	for category := range counts {
		keys = append(keys, string(category))
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%d", key, counts[entities.MetricCategory(key)]))
	}

	return strings.Join(parts, ",")
}

func formatLaneCounts(batch entities.ClassifiedBatch) string {
	counts := map[string]int{
		"context":   0,
		"dashboard": 0,
		"snapshot":  0,
		"window":    0,
	}

	for _, item := range batch.Metrics {
		if item.Classification.LaneMask&entities.LaneContext != 0 {
			counts["context"]++
		}
		if item.Classification.LaneMask&entities.LaneDashboard != 0 {
			counts["dashboard"]++
		}
		if item.Classification.LaneMask&entities.LaneSnapshot != 0 {
			counts["snapshot"]++
		}
		if item.Classification.LaneMask&entities.LaneWindow != 0 {
			counts["window"]++
		}
	}

	keys := []string{"context", "dashboard", "snapshot", "window"}
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%d", key, counts[key]))
	}

	return strings.Join(parts, ",")
}

func countFeatureEligible(batch entities.ClassifiedBatch) int {
	total := 0
	for _, item := range batch.Metrics {
		if item.Classification.FeatureEligible {
			total++
		}
	}
	return total
}
