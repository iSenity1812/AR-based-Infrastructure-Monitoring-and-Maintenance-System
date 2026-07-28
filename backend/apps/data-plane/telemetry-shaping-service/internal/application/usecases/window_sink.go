package usecases

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"telemetry-shaping-service/internal/domain/entities"
)

const DefaultWindowPointLimit = 20

type WindowStore interface {
	UpsertWindowSeries(ctx context.Context, series []entities.WindowSeries, pointLimit int) (int, error)
}

type WindowSink struct {
	store      WindowStore
	pointLimit int
}

func NewWindowSink(store WindowStore, pointLimit int) *WindowSink {
	if pointLimit <= 0 {
		pointLimit = DefaultWindowPointLimit
	}

	return &WindowSink{
		store:      store,
		pointLimit: pointLimit,
	}
}

func (s *WindowSink) Handle(ctx context.Context, batch entities.LaneBatch) error {
	series := buildWindowSeries(batch)
	if len(series) == 0 {
		return nil
	}

	trimmedPoints, err := s.store.UpsertWindowSeries(ctx, series, s.pointLimit)
	if err != nil {
		return fmt.Errorf("persist window series: %w", err)
	}

	log.Printf(
		"window materialized topic=%s partition=%d offset=%d agent_id=%s batch_sequence=%d series_count=%d point_count=%d trimmed_points=%d series=%s",
		batch.Topic,
		batch.Partition,
		batch.Offset,
		batch.AgentID,
		batch.BatchSequence,
		len(series),
		countWindowPoints(series),
		trimmedPoints,
		formatWindowSeries(series),
	)

	return nil
}

func buildWindowSeries(batch entities.LaneBatch) []entities.WindowSeries {
	seriesByKey := make(map[string]*entities.WindowSeries)

	for _, item := range batch.Metrics {
		if !item.Classification.FeatureEligible {
			continue
		}

		key := strings.TrimSpace(item.Metric.SeriesKey)
		if key == "" {
			continue
		}

		windowSeries, ok := seriesByKey[key]
		if !ok {
			windowSeries = &entities.WindowSeries{
				AgentID:       item.Metric.AgentID,
				SeriesKey:     item.Metric.SeriesKey,
				MetricKey:     item.Metric.MetricKey,
				ScopeType:     item.Metric.ScopeType,
				ScopeID:       item.Metric.ScopeID,
				Source:        item.Metric.Source,
				Unit:          item.Metric.Unit,
				BatchSequence: batch.BatchSequence,
				UpdatedAt:     windowUpdatedAt(batch.ReceivedAt, item.Metric.Timestamp),
				Points:        make([]entities.WindowPoint, 0, 1),
			}
			seriesByKey[key] = windowSeries
		}

		windowSeries.Points = append(windowSeries.Points, entities.WindowPoint{
			Timestamp:       item.Metric.Timestamp,
			Value:           item.Metric.Value,
			Category:        item.Classification.Category,
			AggregationHint: item.Classification.AggregationHint,
		})

		if item.Metric.Timestamp.After(windowSeries.UpdatedAt) {
			windowSeries.UpdatedAt = item.Metric.Timestamp
		}
	}

	keys := make([]string, 0, len(seriesByKey))
	for key := range seriesByKey {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	series := make([]entities.WindowSeries, 0, len(keys))
	for _, key := range keys {
		series = append(series, *seriesByKey[key])
	}

	return series
}

func windowUpdatedAt(batchReceivedAt time.Time, metricTimestamp time.Time) time.Time {
	if !metricTimestamp.IsZero() {
		return metricTimestamp.UTC()
	}
	if !batchReceivedAt.IsZero() {
		return batchReceivedAt.UTC()
	}
	return time.Now().UTC()
}

func countWindowPoints(series []entities.WindowSeries) int {
	total := 0
	for _, item := range series {
		total += len(item.Points)
	}
	return total
}

func formatWindowSeries(series []entities.WindowSeries) string {
	parts := make([]string, 0, len(series))
	for _, item := range series {
		parts = append(parts, fmt.Sprintf("%s=%d", item.SeriesKey, len(item.Points)))
	}
	return strings.Join(parts, ",")
}
