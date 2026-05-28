package domain

// Metric is a small self-contained representation used across packages.
type Metric struct {
	Name         string            `json:"name"`
	Value        float64           `json:"value"`
	TextValue    string            `json:"textValue,omitempty"`
	Unit         string            `json:"unit,omitempty"`
	Labels       map[string]string `json:"labels,omitempty"`
	SourceMetric string            `json:"sourceMetric,omitempty"`
	ScopeType    string            `json:"scopeType,omitempty"`
}
