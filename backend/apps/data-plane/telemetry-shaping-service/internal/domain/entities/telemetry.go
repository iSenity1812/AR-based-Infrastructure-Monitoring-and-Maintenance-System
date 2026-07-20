package entities

import "time"

type MetricValueType string

const (
	MetricValueTypeUnknown MetricValueType = "unknown"
	MetricValueTypeNumber  MetricValueType = "number"
	MetricValueTypeText    MetricValueType = "text"
	MetricValueTypeBool    MetricValueType = "bool"
	MetricValueTypeNull    MetricValueType = "null"
)

type MetricCategory string

const (
	MetricCategoryUnknown              MetricCategory = "unknown"
	MetricCategoryIdentityAndInventory MetricCategory = "identity_and_inventory"
	MetricCategoryCompute              MetricCategory = "compute"
	MetricCategoryMemory               MetricCategory = "memory"
	MetricCategoryStorage              MetricCategory = "storage"
	MetricCategoryNetwork              MetricCategory = "network"
	MetricCategoryTcpConnectionHealth  MetricCategory = "tcp_connection_health"
	MetricCategoryRuntimeAndOS         MetricCategory = "runtime_and_os"
	MetricCategoryResourceRuntime      MetricCategory = "resource_runtime"
	MetricCategoryInventoryCounts      MetricCategory = "inventory_counts"
	MetricCategoryServiceRollup        MetricCategory = "service_rollup"
	MetricCategoryHardwareHealth       MetricCategory = "hardware_health"
)

type LaneMask uint8

const (
	LaneNone      LaneMask = 0
	LaneDashboard LaneMask = 1 << iota
	LaneWindow
	LaneSnapshot
	LaneContext
)

type LaneName string

const (
	LaneNameContext   LaneName = "context"
	LaneNameDashboard LaneName = "dashboard"
	LaneNameSnapshot  LaneName = "snapshot"
	LaneNameWindow    LaneName = "window"
)

type MetricValue struct {
	Type   MetricValueType
	Number *float64
	Text   *string
	Bool   *bool
}

type AggregationHint string

type MetricClassification struct {
	Category        MetricCategory
	LaneMask        LaneMask
	FeatureEligible bool
	AggregationHint AggregationHint
}

type ClassifiedMetric struct {
	Metric         NormalizedMetric
	Classification MetricClassification
}

func NewNumberMetricValue(value float64) MetricValue {
	return MetricValue{Type: MetricValueTypeNumber, Number: &value}
}

func NewTextMetricValue(value string) MetricValue {
	return MetricValue{Type: MetricValueTypeText, Text: &value}
}

func NewBoolMetricValue(value bool) MetricValue {
	return MetricValue{Type: MetricValueTypeBool, Bool: &value}
}

func NewNullMetricValue() MetricValue {
	return MetricValue{Type: MetricValueTypeNull}
}

type DecodedBatch struct {
	AgentID             string
	MessageKey          string
	SourceType          string
	Topic               string
	Partition           int32
	Offset              int64
	ReceivedAt          time.Time
	BatchSequence       int64
	BatchRecordCount    int
	HardwareFingerprint map[string]string
	Headers             map[string]string
	Metrics             []DecodedMetricRecord
}

type DecodedMetricRecord struct {
	MetricKey    string
	ScopeID      string
	ScopeType    string
	Source       string
	SourceMetric string
	TimestampRaw string
	Unit         string
	Tags         map[string]string
	ValueRaw     any
}

type NormalizationReport struct {
	InputMetricCount   int
	OutputMetricCount  int
	DroppedMetricCount int
	DroppedMetrics     []DroppedMetric
}

type DroppedMetric struct {
	MetricKey string
	Reason    string
}

type NormalizedBatch struct {
	AgentID             string
	MessageKey          string
	SourceType          string
	Topic               string
	Partition           int32
	Offset              int64
	ReceivedAt          time.Time
	BatchSequence       int64
	BatchRecordCount    int
	HardwareFingerprint map[string]string
	Headers             map[string]string
	Metrics             []NormalizedMetric
	Report              NormalizationReport
}

type NormalizedMetric struct {
	AgentID      string
	MetricKey    string
	ScopeID      string
	ScopeType    string
	Source       string
	SourceMetric string
	Timestamp    time.Time
	Unit         string
	Tags         map[string]string
	Value        MetricValue
	SeriesKey    string
}

func (m NormalizedMetric) IsNumeric() bool {
	return m.Value.Type == MetricValueTypeNumber && m.Value.Number != nil
}

type ClassifiedBatch struct {
	Batch   NormalizedBatch
	Metrics []ClassifiedMetric
}

type LaneBatch struct {
	Lane                LaneName
	AgentID             string
	MessageKey          string
	SourceType          string
	Topic               string
	Partition           int32
	Offset              int64
	ReceivedAt          time.Time
	BatchSequence       int64
	BatchRecordCount    int
	HardwareFingerprint map[string]string
	Headers             map[string]string
	Metrics             []ClassifiedMetric
}

type RoutedLaneBatch struct {
	Batch     ClassifiedBatch
	Context   LaneBatch
	Dashboard LaneBatch
	Snapshot  LaneBatch
	Window    LaneBatch
}

type SnapshotMetric struct {
	Metric         NormalizedMetric
	Classification MetricClassification
}

type SnapshotDocument struct {
	AgentID       string
	ScopeType     string
	ScopeID       string
	UpdatedAt     time.Time
	BatchSequence int64
	Metrics       map[string]SnapshotMetric
}

type ContextFieldValue struct {
	Value     MetricValue
	MetricKey string
	Source    string
	Unit      string
}

type ContextDocument struct {
	AgentID       string
	ScopeType     string
	ScopeID       string
	UpdatedAt     time.Time
	BatchSequence int64
	Identity      map[string]ContextFieldValue
	Relations     map[string]ContextFieldValue
	Capacity      map[string]ContextFieldValue
	Inventory     map[string]ContextFieldValue
	Attributes    map[string]ContextFieldValue
}

type DashboardFieldValue struct {
	Value     MetricValue
	MetricKey string
	Source    string
	Unit      string
}

type DashboardDocument struct {
	AgentID       string
	ScopeType     string
	ScopeID       string
	UpdatedAt     time.Time
	BatchSequence int64
	Status        map[string]DashboardFieldValue
	Resources     map[string]DashboardFieldValue
	Storage       map[string]DashboardFieldValue
	Network       map[string]DashboardFieldValue
	Health        map[string]DashboardFieldValue
	Counts        map[string]DashboardFieldValue
}

type WindowPoint struct {
	Timestamp       time.Time
	Value           MetricValue
	Category        MetricCategory
	AggregationHint AggregationHint
}

type WindowSeries struct {
	AgentID       string
	SeriesKey     string
	MetricKey     string
	ScopeType     string
	ScopeID       string
	Source        string
	Unit          string
	BatchSequence int64
	UpdatedAt     time.Time
	Points        []WindowPoint
}
