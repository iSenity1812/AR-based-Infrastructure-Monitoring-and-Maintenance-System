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

type SnapshotStore interface {
	UpsertSnapshots(ctx context.Context, snapshots []entities.SnapshotDocument) error
}

type SnapshotSink struct {
	store SnapshotStore
}

func NewSnapshotSink(store SnapshotStore) *SnapshotSink {
	return &SnapshotSink{store: store}
}

func (s *SnapshotSink) Handle(ctx context.Context, batch entities.LaneBatch) error {
	snapshots := buildSnapshotDocuments(batch)
	if len(snapshots) == 0 {
		return nil
	}

	if err := s.store.UpsertSnapshots(ctx, snapshots); err != nil {
		return fmt.Errorf("persist snapshots: %w", err)
	}

	log.Printf(
		"snapshot materialized topic=%s partition=%d offset=%d agent_id=%s batch_sequence=%d scope_count=%d metric_count=%d scopes=%s",
		batch.Topic,
		batch.Partition,
		batch.Offset,
		batch.AgentID,
		batch.BatchSequence,
		len(snapshots),
		len(batch.Metrics),
		formatSnapshotScopes(snapshots),
	)

	return nil
}

func buildSnapshotDocuments(batch entities.LaneBatch) []entities.SnapshotDocument {
	byScope := make(map[string]*entities.SnapshotDocument)

	for _, item := range batch.Metrics {
		scopeType := strings.TrimSpace(item.Metric.ScopeType)
		if scopeType == "" {
			scopeType = "unknown"
		}

		scopeID := strings.TrimSpace(item.Metric.ScopeID)
		if scopeID == "" {
			scopeID = batch.AgentID
		}

		key := scopeType + "|" + scopeID
		document, ok := byScope[key]
		if !ok {
			document = &entities.SnapshotDocument{
				AgentID:       batch.AgentID,
				ScopeType:     scopeType,
				ScopeID:       scopeID,
				UpdatedAt:     snapshotUpdatedAt(batch.ReceivedAt, item.Metric.Timestamp),
				BatchSequence: batch.BatchSequence,
				Metrics:       make(map[string]entities.SnapshotMetric),
			}
			byScope[key] = document
		}

		document.Metrics[item.Metric.MetricKey] = entities.SnapshotMetric{
			Metric:         item.Metric,
			Classification: item.Classification,
		}

		if item.Metric.Timestamp.After(document.UpdatedAt) {
			document.UpdatedAt = item.Metric.Timestamp
		}
	}

	keys := make([]string, 0, len(byScope))
	for key := range byScope {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	documents := make([]entities.SnapshotDocument, 0, len(keys))
	for _, key := range keys {
		documents = append(documents, *byScope[key])
	}

	return documents
}

func snapshotUpdatedAt(batchReceivedAt time.Time, metricTimestamp time.Time) time.Time {
	if !metricTimestamp.IsZero() {
		return metricTimestamp.UTC()
	}
	if !batchReceivedAt.IsZero() {
		return batchReceivedAt.UTC()
	}
	return time.Now().UTC()
}

func formatSnapshotScopes(snapshots []entities.SnapshotDocument) string {
	parts := make([]string, 0, len(snapshots))
	for _, snapshot := range snapshots {
		parts = append(parts, fmt.Sprintf("%s:%s=%d", snapshot.ScopeType, snapshot.ScopeID, len(snapshot.Metrics)))
	}
	return strings.Join(parts, ",")
}
