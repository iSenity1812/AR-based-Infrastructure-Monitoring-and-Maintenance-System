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

type DashboardStore interface {
	UpsertDashboards(ctx context.Context, documents []entities.DashboardDocument) error
}

type DashboardSink struct {
	store     DashboardStore
	ruleIndex map[string]DashboardFieldRule
}

func NewDashboardSink(store DashboardStore) *DashboardSink {
	return &DashboardSink{
		store:     store,
		ruleIndex: buildDashboardRuleIndex(),
	}
}

func (s *DashboardSink) Handle(ctx context.Context, batch entities.LaneBatch) error {
	documents := s.buildDashboardDocuments(batch)
	if len(documents) == 0 {
		return nil
	}

	if err := s.store.UpsertDashboards(ctx, documents); err != nil {
		return fmt.Errorf("persist dashboards: %w", err)
	}

	log.Printf(
		"dashboard materialized topic=%s partition=%d offset=%d agent_id=%s batch_sequence=%d scope_count=%d metric_count=%d scopes=%s",
		batch.Topic,
		batch.Partition,
		batch.Offset,
		batch.AgentID,
		batch.BatchSequence,
		len(documents),
		len(batch.Metrics),
		formatDashboardScopes(documents),
	)

	return nil
}

func (s *DashboardSink) buildDashboardDocuments(batch entities.LaneBatch) []entities.DashboardDocument {
	byScope := make(map[string]*entities.DashboardDocument)

	for _, item := range batch.Metrics {
		scopeType := normalizedDashboardScopeType(item.Metric.ScopeType)
		scopeID := normalizedDashboardScopeID(batch.AgentID, item.Metric.ScopeID)
		rule, ok := s.ruleIndex[dashboardRuleKey(scopeType, item.Metric.MetricKey)]
		if !ok {
			continue
		}

		key := scopeType + "|" + scopeID
		document, found := byScope[key]
		if !found {
			document = &entities.DashboardDocument{
				AgentID:       batch.AgentID,
				ScopeType:     scopeType,
				ScopeID:       scopeID,
				UpdatedAt:     dashboardUpdatedAt(batch.ReceivedAt, item.Metric.Timestamp),
				BatchSequence: batch.BatchSequence,
				Status:        make(map[string]entities.DashboardFieldValue),
				Resources:     make(map[string]entities.DashboardFieldValue),
				Storage:       make(map[string]entities.DashboardFieldValue),
				Network:       make(map[string]entities.DashboardFieldValue),
				Health:        make(map[string]entities.DashboardFieldValue),
				Counts:        make(map[string]entities.DashboardFieldValue),
			}
			byScope[key] = document
		}

		s.assignDashboardField(document, item, rule)
		if item.Metric.Timestamp.After(document.UpdatedAt) {
			document.UpdatedAt = item.Metric.Timestamp
		}
	}

	keys := make([]string, 0, len(byScope))
	for key := range byScope {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	documents := make([]entities.DashboardDocument, 0, len(keys))
	for _, key := range keys {
		documents = append(documents, *byScope[key])
	}
	return documents
}

func (s *DashboardSink) assignDashboardField(
	document *entities.DashboardDocument,
	item entities.ClassifiedMetric,
	rule DashboardFieldRule,
) {
	value := entities.DashboardFieldValue{
		Value:     item.Metric.Value,
		MetricKey: item.Metric.MetricKey,
		Source:    item.Metric.Source,
		Unit:      item.Metric.Unit,
	}

	switch rule.Section {
	case dashboardSectionStatus:
		document.Status[rule.Field] = value
	case dashboardSectionResources:
		document.Resources[rule.Field] = value
	case dashboardSectionStorage:
		document.Storage[rule.Field] = value
	case dashboardSectionNetwork:
		document.Network[rule.Field] = value
	case dashboardSectionHealth:
		document.Health[rule.Field] = value
	case dashboardSectionCounts:
		document.Counts[rule.Field] = value
	}
}

func dashboardUpdatedAt(batchReceivedAt time.Time, metricTimestamp time.Time) time.Time {
	if !metricTimestamp.IsZero() {
		return metricTimestamp.UTC()
	}
	if !batchReceivedAt.IsZero() {
		return batchReceivedAt.UTC()
	}
	return time.Now().UTC()
}

func formatDashboardScopes(documents []entities.DashboardDocument) string {
	parts := make([]string, 0, len(documents))
	for _, document := range documents {
		fieldCount := len(document.Status) + len(document.Resources) + len(document.Storage) + len(document.Network) + len(document.Health) + len(document.Counts)
		parts = append(parts, fmt.Sprintf("%s:%s=%d", document.ScopeType, document.ScopeID, fieldCount))
	}
	return strings.Join(parts, ",")
}

func normalizedDashboardScopeType(scopeType string) string {
	scopeType = strings.TrimSpace(scopeType)
	if scopeType == "" {
		return "unknown"
	}
	return scopeType
}

func normalizedDashboardScopeID(agentID, scopeID string) string {
	scopeID = strings.TrimSpace(scopeID)
	if scopeID == "" {
		return agentID
	}
	return scopeID
}
