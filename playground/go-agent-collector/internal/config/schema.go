package config

import "time"

// Config is the fully loaded runtime configuration for the agent.
type Config struct {
	BaseDir   string `yaml:"-"`
	ConfigDir string `yaml:"-"`
	EnvFile   string `yaml:"-"`

	Agent         AgentConfig         `yaml:"agent"`
	Scrape        ScrapeConfig        `yaml:"scrape"`
	Send          SendConfig          `yaml:"send"`
	Retry         RetryConfig         `yaml:"retry"`
	Buffer        BufferConfig        `yaml:"buffer"`
	Queue         QueueConfig         `yaml:"queue"`
	Logging       LoggingConfig       `yaml:"logging"`
	Observability ObservabilityConfig `yaml:"observability"`
	Features      FeatureConfig       `yaml:"features"`
	Node          NodeConfig          `yaml:"node"`
	Topology      TopologyConfig      `yaml:"topology"`
	Network       NetworkConfig       `yaml:"network"`
	Tags          TagConfig           `yaml:"tags"`
	Metrics       []MetricRule        `yaml:"metrics"`

	Runtime RuntimeConfig `yaml:"-"`
}

type AgentConfig struct {
	SchemaVersion string        `yaml:"schemaVersion"`
	SourceType    string        `yaml:"sourceType"`
	Mode          string        `yaml:"mode"`
	AgentVersion  string        `yaml:"agentVersion"`
	Identity      IdentityRules `yaml:"identity"`
}

type IdentityRules struct {
	AgentID         string `yaml:"agentId"`
	AgentName       string `yaml:"agentName"`
	AgentIDEnv      string `yaml:"agentIdEnv"`
	AgentNameEnv    string `yaml:"agentNameEnv"`
	AgentIDStrategy string `yaml:"agentIdStrategy"`
	AgentNameStrat  string `yaml:"agentNameStrategy"`
	AgentIDPrefix   string `yaml:"agentIdPrefix"`
	HostnameEnv     string `yaml:"hostnameEnv"`
}

type ScrapeConfig struct {
	Endpoint      string `yaml:"endpoint"`
	Interval      string `yaml:"interval"`
	Timeout       string `yaml:"timeout"`
	MaxBodySizeMB int    `yaml:"maxBodySizeMb"`
}

type SendConfig struct {
	Endpoint        string `yaml:"endpoint"`
	Interval        string `yaml:"interval"`
	Timeout         string `yaml:"timeout"`
	MaxBatchItems   int    `yaml:"maxBatchItems"`
	MaxBatchBytesKB int    `yaml:"maxBatchBytesKb"`
	AuthTokenEnv    string `yaml:"authTokenEnv"`
}

type RetryConfig struct {
	MinBackoff           string `yaml:"minBackoff"`
	MaxBackoff           string `yaml:"maxBackoff"`
	MaxAttempts          int    `yaml:"maxAttempts"`
	RetryableStatusCodes []int  `yaml:"retryableStatusCodes"`
}

type BufferConfig struct {
	Enabled        bool   `yaml:"enabled"`
	Path           string `yaml:"path"`
	MaxSizeMB      int    `yaml:"maxSizeMb"`
	MaxBatchFiles  int    `yaml:"maxBatchFiles"`
	OverflowPolicy string `yaml:"overflowPolicy"`
}

type QueueConfig struct {
	MaxRecords     int    `yaml:"maxRecords"`
	OverflowPolicy string `yaml:"overflowPolicy"`
}

type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
	Output string `yaml:"output"`
}

type ObservabilityConfig struct {
	HealthAddress string `yaml:"healthAddress"`
}

type FeatureConfig struct {
	ConfigReload        bool `yaml:"configReload"`
	LocalHealthEndpoint bool `yaml:"localHealthEndpoint"`
	InternalMetrics     bool `yaml:"internalMetrics"`
	LinuxAdapter        bool `yaml:"linuxAdapter"`
}

type NodeConfig struct {
	NodeID         string `yaml:"nodeId"`
	NodeName       string `yaml:"nodeName"`
	Hostname       string `yaml:"hostname"`
	NodeIDEnv      string `yaml:"nodeIdEnv"`
	NodeNameEnv    string `yaml:"nodeNameEnv"`
	HostnameEnv    string `yaml:"hostnameEnv"`
	NodeIDStrategy string `yaml:"nodeIdStrategy"`
	NodeNameStrat  string `yaml:"nodeNameStrategy"`
	NodeIDPrefix   string `yaml:"nodeIdPrefix"`
	DeviceType     string `yaml:"deviceType"`
}

type TopologyConfig struct {
	RackID      string `yaml:"rackId"`
	SwitchID    string `yaml:"switchId"`
	Site        string `yaml:"site"`
	Environment string `yaml:"environment"`
}

type NetworkConfig struct {
	PrimaryUplink      string   `yaml:"primaryUplink"`
	PrimaryNICHint     string   `yaml:"primaryNicHint"`
	PrimaryNICEnv      string   `yaml:"primaryNicEnv"`
	ExcludeNICPatterns []string `yaml:"excludeNicPatterns"`
}

type TagConfig struct {
	OwnerTeam  string `yaml:"ownerTeam"`
	Deployment string `yaml:"deployment"`
}

type MetricRule struct {
	Category     string     `yaml:"category"`
	Key          string     `yaml:"key"`
	Status       string     `yaml:"status"`
	Enabled      bool       `yaml:"enabled"`
	SourceMetric StringList `yaml:"sourceMetric"`
	ScopeType    string     `yaml:"scopeType"`
	Unit         string     `yaml:"unit"`
	ValueType    string     `yaml:"valueType"`
	Aggregation  string     `yaml:"aggregation"`
	KeepLabels   []string   `yaml:"keepLabels"`
	Notes        string     `yaml:"notes"`
}

type RuntimeConfig struct {
	Hostname         string
	AgentID          string
	AgentName        string
	NodeID           string
	NodeName         string
	PrimaryNICHint   string
	AuthToken        string
	MetricConfigPath string
	ScrapeInterval   time.Duration
	ScrapeTimeout    time.Duration
	SendInterval     time.Duration
	SendTimeout      time.Duration
	RetryMinBackoff  time.Duration
	RetryMaxBackoff  time.Duration
}
