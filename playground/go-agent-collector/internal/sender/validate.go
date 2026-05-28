package sender

import "fmt"

func ValidatePayload(payload Payload) error {
	if payload.SchemaVersion == "" {
		return fmt.Errorf("schemaVersion is required")
	}
	if payload.Agent.AgentID == "" {
		return fmt.Errorf("agent.agentId is required")
	}
	if payload.Agent.SourceType == "" {
		return fmt.Errorf("agent.sourceType is required")
	}
	if payload.Batch.BatchID == "" {
		return fmt.Errorf("batch.batchId is required")
	}
	if payload.Batch.RecordCount != len(payload.Metrics) {
		return fmt.Errorf("batch.recordCount must match metrics length")
	}
	for i, metric := range payload.Metrics {
		if metric.MetricKey == "" {
			return fmt.Errorf("metrics[%d].metricKey is required", i)
		}
		if metric.ScopeType == "" {
			return fmt.Errorf("metrics[%d].scopeType is required", i)
		}
		if metric.ScopeID == "" {
			return fmt.Errorf("metrics[%d].scopeId is required", i)
		}
		if metric.Unit == "" {
			return fmt.Errorf("metrics[%d].unit is required", i)
		}
		if metric.Timestamp == "" {
			return fmt.Errorf("metrics[%d].timestamp is required", i)
		}
		if metric.Source == "" {
			return fmt.Errorf("metrics[%d].source is required", i)
		}
		if metric.SourceMetric == "" {
			return fmt.Errorf("metrics[%d].sourceMetric is required", i)
		}
	}
	return nil
}
