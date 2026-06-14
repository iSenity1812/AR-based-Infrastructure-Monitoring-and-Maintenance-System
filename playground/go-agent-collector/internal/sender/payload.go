package sender

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
	PrimaryIPv4      string `json:"primaryIpv4,omitempty"`
	MACAddress       string `json:"macAddress,omitempty"`
	HardwareSerial   string `json:"hardwareSerial,omitempty"`
	OSProduct        string `json:"osProduct,omitempty"`
	LogicalCPUCount  string `json:"logicalCpuCount,omitempty"`
	CPUArchitecture  string `json:"cpuArchitecture,omitempty"`
	MotherboardModel string `json:"motherboardModel,omitempty"`
	CPUModel         string `json:"cpuModel,omitempty"`
	GPUModelPrimary  string `json:"gpuModelPrimary,omitempty"`
	SSDModelPrimary  string `json:"ssdModelPrimary,omitempty"`
	BatteryModel     string `json:"batteryModel,omitempty"`
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
