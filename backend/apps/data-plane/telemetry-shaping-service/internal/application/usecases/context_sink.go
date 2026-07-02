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

type ContextStore interface {
	UpsertContexts(ctx context.Context, documents []entities.ContextDocument) error
}

type ContextSink struct {
	store     ContextStore
	ruleIndex map[string]ContextFieldRule
}

func NewContextSink(store ContextStore) *ContextSink {
	return &ContextSink{
		store:     store,
		ruleIndex: buildContextRuleIndex(),
	}
}

func (s *ContextSink) Handle(ctx context.Context, batch entities.LaneBatch) error {
	documents := s.buildContextDocuments(batch)
	if len(documents) == 0 {
		return nil
	}

	if err := s.store.UpsertContexts(ctx, documents); err != nil {
		return fmt.Errorf("persist contexts: %w", err)
	}

	log.Printf(
		"context materialized topic=%s partition=%d offset=%d agent_id=%s batch_sequence=%d scope_count=%d metric_count=%d scopes=%s",
		batch.Topic,
		batch.Partition,
		batch.Offset,
		batch.AgentID,
		batch.BatchSequence,
		len(documents),
		len(batch.Metrics),
		formatContextScopes(documents),
	)

	return nil
}

func (s *ContextSink) buildContextDocuments(batch entities.LaneBatch) []entities.ContextDocument {
	byScope := make(map[string]*entities.ContextDocument)

	for _, item := range batch.Metrics {
		scopeType := normalizedScopeType(item.Metric.ScopeType)
		scopeID := normalizedScopeID(batch.AgentID, item.Metric.ScopeID)
		key := scopeType + "|" + scopeID

		document, ok := byScope[key]
		if !ok {
			document = &entities.ContextDocument{
				AgentID:       batch.AgentID,
				ScopeType:     scopeType,
				ScopeID:       scopeID,
				UpdatedAt:     contextUpdatedAt(batch.ReceivedAt, item.Metric.Timestamp),
				BatchSequence: batch.BatchSequence,
				Identity:      make(map[string]entities.ContextFieldValue),
				Relations:     make(map[string]entities.ContextFieldValue),
				Capacity:      make(map[string]entities.ContextFieldValue),
				Inventory:     make(map[string]entities.ContextFieldValue),
				Attributes:    make(map[string]entities.ContextFieldValue),
			}
			byScope[key] = document
		}

		s.assignContextField(document, item, scopeType)
		if item.Metric.Timestamp.After(document.UpdatedAt) {
			document.UpdatedAt = item.Metric.Timestamp
		}
	}

	keys := make([]string, 0, len(byScope))
	for key := range byScope {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	documents := make([]entities.ContextDocument, 0, len(keys))
	for _, key := range keys {
		documents = append(documents, *byScope[key])
	}
	return documents
}

func (s *ContextSink) assignContextField(document *entities.ContextDocument, item entities.ClassifiedMetric, scopeType string) {
	value := entities.ContextFieldValue{
		Value:     item.Metric.Value,
		MetricKey: item.Metric.MetricKey,
		Source:    item.Metric.Source,
		Unit:      item.Metric.Unit,
	}

	rule, ok := s.ruleIndex[contextRuleKey(scopeType, item.Metric.MetricKey)]
	if !ok {
		document.Attributes[item.Metric.MetricKey] = value
		return
	}

	switch rule.Section {
	case contextSectionIdentity:
		document.Identity[rule.Field] = value
	case contextSectionRelations:
		document.Relations[rule.Field] = value
	case contextSectionCapacity:
		document.Capacity[rule.Field] = value
	case contextSectionInventory:
		document.Inventory[rule.Field] = value
	default:
		document.Attributes[rule.Field] = value
	}
}

func contextUpdatedAt(batchReceivedAt time.Time, metricTimestamp time.Time) time.Time {
	if !metricTimestamp.IsZero() {
		return metricTimestamp.UTC()
	}
	if !batchReceivedAt.IsZero() {
		return batchReceivedAt.UTC()
	}
	return time.Now().UTC()
}

func formatContextScopes(documents []entities.ContextDocument) string {
	parts := make([]string, 0, len(documents))
	for _, document := range documents {
		fieldCount := len(document.Identity) + len(document.Relations) + len(document.Capacity) + len(document.Inventory) + len(document.Attributes)
		parts = append(parts, fmt.Sprintf("%s:%s=%d", document.ScopeType, document.ScopeID, fieldCount))
	}
	return strings.Join(parts, ",")
}

func normalizedScopeType(scopeType string) string {
	scopeType = strings.TrimSpace(scopeType)
	if scopeType == "" {
		return "unknown"
	}
	return scopeType
}

func normalizedScopeID(agentID, scopeID string) string {
	scopeID = strings.TrimSpace(scopeID)
	if scopeID == "" {
		return agentID
	}
	return scopeID
}
