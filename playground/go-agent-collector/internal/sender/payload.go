package sender

type Payload struct {
	SchemaVersion string         `json:"schemaVersion"`
	Agent         AgentMeta      `json:"agent"`
	Batch         BatchMeta      `json:"batch"`
	Metrics       []MetricRecord `json:"metrics"`
}

type AgentMeta struct {
	AgentID      string `json:"agentId"`
	AgentName    string `json:"agentName"`
	SourceType   string `json:"sourceType"`
	AgentVersion string `json:"agentVersion"`
	Hostname     string `json:"hostname"`
	StartedAt    string `json:"startedAt"`
}

type BatchMeta struct {
	BatchID      string `json:"batchId"`
	Sequence     int64  `json:"sequence"`
	CollectedAt  string `json:"collectedAt"`
	SentAt       string `json:"sentAt"`
	RecordCount  int    `json:"recordCount"`
	DroppedCount int    `json:"droppedCount"`
}

type MetricRecord struct {
	MetricKey    string            `json:"metricKey"`
	ScopeType    string            `json:"scopeType"`
	ScopeID      string            `json:"scopeId"`
	Value        any               `json:"value"`
	Unit         string            `json:"unit"`
	Timestamp    string            `json:"timestamp"`
	Source       string            `json:"source"`
	SourceMetric string            `json:"sourceMetric"`
	Tags         map[string]string `json:"tags,omitempty"`
}
