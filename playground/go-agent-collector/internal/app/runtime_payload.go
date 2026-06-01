package app

import (
	"fmt"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

type batchCounter struct {
	sequence  int64
	startedAt time.Time
}

func newBatchCounter() *batchCounter {
	return &batchCounter{startedAt: time.Now().UTC()}
}

func buildPayload(cfg *config.Config, records []queueRecord, droppedCount int, counter *batchCounter, sentAt time.Time) sender.Payload {
	counter.sequence++
	collectedAt := sentAt
	if len(records) > 0 {
		collectedAt = records[0].collectedAt
	}

	metrics := make([]sender.MetricRecord, 0, len(records))
	for _, record := range records {
		metrics = append(metrics, sender.MetricRecord{
			MetricKey:    record.metric.Name,
			ScopeType:    firstNonEmpty(record.metric.ScopeType, "node"),
			ScopeID:      cfg.Runtime.NodeID,
			Value:        metricValue(record.metric),
			Unit:         record.metric.Unit,
			Timestamp:    record.collectedAt.UTC().Format(time.RFC3339),
			Source:       cfg.Agent.SourceType,
			SourceMetric: record.metric.SourceMetric,
			Tags:         buildTags(cfg, record.metric),
		})
	}

	return sender.Payload{
		SchemaVersion: cfg.Agent.SchemaVersion,
		Agent: sender.AgentMeta{
			AgentID:      cfg.Runtime.AgentID,
			AgentName:    cfg.Runtime.AgentName,
			SourceType:   cfg.Agent.SourceType,
			AgentVersion: cfg.Agent.AgentVersion,
			Hostname:     cfg.Runtime.Hostname,
			StartedAt:    counter.startedAt.Format(time.RFC3339),
		},
		Batch: sender.BatchMeta{
			BatchID:      fmt.Sprintf("%s-%d", cfg.Runtime.AgentID, counter.sequence),
			Sequence:     counter.sequence,
			CollectedAt:  collectedAt.UTC().Format(time.RFC3339),
			SentAt:       sentAt.UTC().Format(time.RFC3339),
			RecordCount:  len(metrics),
			DroppedCount: droppedCount,
		},
		Metrics: metrics,
	}
}

func buildTags(cfg *config.Config, metric domain.Metric) map[string]string {
	tags := map[string]string{
		"nodeId":      cfg.Runtime.NodeID,
		"site":        cfg.Topology.Site,
		"environment": cfg.Topology.Environment,
		"hostname":    cfg.Runtime.Hostname,
		"deviceType":  cfg.Node.DeviceType,
	}
	if cfg.Topology.RackID != "" {
		tags["rackId"] = cfg.Topology.RackID
	}
	if cfg.Topology.SwitchID != "" {
		tags["switchId"] = cfg.Topology.SwitchID
	}
	if cfg.Runtime.PrimaryNICHint != "" {
		tags["primaryNic"] = cfg.Runtime.PrimaryNICHint
	}
	for key, value := range metric.Labels {
		tags[key] = value
	}
	return tags
}

func metricValue(metric domain.Metric) any {
	if metric.TextValue != "" {
		return metric.TextValue
	}
	return metric.Value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
