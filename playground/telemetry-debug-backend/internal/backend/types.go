package backend

type Payload struct {
	SchemaVersion string         `json:"schemaVersion"`
	Agent         AgentMeta      `json:"agent"`
	Batch         BatchMeta      `json:"batch"`
	Context       PayloadContext `json:"context,omitempty"`
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

type PayloadContext struct {
	Identity            ContextIdentity     `json:"identity,omitempty"`
	HardwareFingerprint HardwareFingerprint `json:"hardwareFingerprint,omitempty"`
}

type ContextIdentity struct {
	Hostname   string `json:"hostname,omitempty"`
	NodeID     string `json:"nodeId,omitempty"`
	Source     string `json:"source,omitempty"`
	DeviceType string `json:"deviceType,omitempty"`
}

type HardwareFingerprint struct {
	PrimaryIPv4     string `json:"primaryIpv4,omitempty"`
	MACAddress      string `json:"macAddress,omitempty"`
	HardwareSerial  string `json:"hardwareSerial,omitempty"`
	OSProduct       string `json:"osProduct,omitempty"`
	LogicalCPUCount string `json:"logicalCpuCount,omitempty"`
	CPUArchitecture string `json:"cpuArchitecture,omitempty"`
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

type BatchSummary struct {
	BatchID      string         `json:"batchId"`
	AgentID      string         `json:"agentId"`
	Hostname     string         `json:"hostname"`
	Context      PayloadContext `json:"context,omitempty"`
	Transport    string         `json:"transport,omitempty"`
	RecordCount  int            `json:"recordCount"`
	DroppedCount int            `json:"droppedCount"`
	ReceivedAt   string         `json:"receivedAt"`
	PublishedTo  string         `json:"publishedTo,omitempty"`
	EnvelopeSize int            `json:"envelopeSize,omitempty"`
	MetricKeys   []string       `json:"metricKeys"`
	Metrics      []MetricRecord `json:"metrics,omitempty"`
}

type FailMode struct {
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message"`
	Remaining  int    `json:"remaining"`
}
