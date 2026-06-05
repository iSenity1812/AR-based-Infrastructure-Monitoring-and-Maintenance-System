package sender

import "testing"

func TestValidatePayloadRejectsMissingFields(t *testing.T) {
	err := ValidatePayload(Payload{})
	if err == nil {
		t.Fatal("expected validation error for empty payload")
	}
}

func TestValidatePayloadAcceptsValidPayload(t *testing.T) {
	payload := Payload{
		SchemaVersion: "v1",
		Agent: AgentMeta{
			AgentID:    "agent-1",
			SourceType: "windows_exporter",
		},
		Batch: BatchMeta{
			BatchID:     "batch-1",
			RecordCount: 1,
		},
		Metrics: []MetricRecord{{
			MetricKey:    "node.process_count",
			ScopeType:    "node",
			ScopeID:      "node-1",
			Value:        3,
			Unit:         "count",
			Timestamp:    "2026-05-28T00:00:00Z",
			Source:       "windows_exporter",
			SourceMetric: "windows_system_processes",
		}},
	}

	if err := ValidatePayload(payload); err != nil {
		t.Fatalf("expected valid payload, got %v", err)
	}
}

func TestValidatePayloadAcceptsMixedNodeAndContainerScopes(t *testing.T) {
	payload := Payload{
		SchemaVersion: "v1",
		Agent: AgentMeta{
			AgentID:    "agent-1",
			SourceType: "multi_source",
		},
		Batch: BatchMeta{
			BatchID:     "batch-1",
			RecordCount: 2,
		},
		Metrics: []MetricRecord{
			{
				MetricKey:    "node.process_count",
				ScopeType:    "node",
				ScopeID:      "node-1",
				Value:        3,
				Unit:         "count",
				Timestamp:    "2026-05-28T00:00:00Z",
				Source:       "windows_exporter",
				SourceMetric: "windows_system_processes",
			},
			{
				MetricKey:    "container.cpu_usage_pct",
				ScopeType:    "container",
				ScopeID:      "container-1",
				Value:        15.5,
				Unit:         "%",
				Timestamp:    "2026-05-28T00:00:00Z",
				Source:       "docker",
				SourceMetric: "docker.stats.cpu",
			},
		},
	}

	if err := ValidatePayload(payload); err != nil {
		t.Fatalf("expected mixed payload to be valid, got %v", err)
	}
}
