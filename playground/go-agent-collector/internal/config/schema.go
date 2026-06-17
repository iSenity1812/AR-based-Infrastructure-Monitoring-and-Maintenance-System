package config

import "time"

// Config is the fully loaded runtime configuration for the agent.
type Config struct {
	BaseDir   string `yaml:"-"`
	ConfigDir string `yaml:"-"`
	EnvFile   string `yaml:"-"`

	Agent         AgentConfig         `yaml:"agent"`
	Sources       SourcesConfig       `yaml:"sources"`
	Scrape        ScrapeConfig        `yaml:"scrape"`
	Send          SendConfig          `yaml:"send"`
	Registration  RegistrationConfig  `yaml:"registration"`
	Retry         RetryConfig         `yaml:"retry"`
	Buffer        BufferConfig        `yaml:"buffer"`
	Queue         QueueConfig         `yaml:"queue"`
	Logging       LoggingConfig       `yaml:"logging"`
	Observability ObservabilityConfig `yaml:"observability"`
	Features      FeatureConfig       `yaml:"features"`
	Node          NodeConfig          `yaml:"node"`
	Topology      TopologyConfig      `yaml:"topology"`
	Network       NetworkConfig       `yaml:"network"`
	Docker        DockerConfig        `yaml:"docker"`
	LHM           LHMConfig           `yaml:"lhm"`
	Tags          TagConfig           `yaml:"tags"`
	Metrics       []MetricRule        `yaml:"metrics"`
	DockerMetrics []MetricRule        `yaml:"dockerMetrics"`
	LHMMetrics    []MetricRule        `yaml:"lhmMetrics"`

	Runtime RuntimeConfig `yaml:"-"`
}

type AgentConfig struct {
	SchemaVersion string        `yaml:"schemaVersion"`
	SourceType    string        `yaml:"sourceType"`
	Mode          string        `yaml:"mode"`
	AgentVersion  string        `yaml:"agentVersion"`
	Identity      IdentityRules `yaml:"identity"`
}

type SourcesConfig struct {
	Enabled StringList `yaml:"enabled"`
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
	Transport       string `yaml:"transport"`
	Endpoint        string `yaml:"endpoint"`
	Interval        string `yaml:"interval"`
	Timeout         string `yaml:"timeout"`
	GRPCTimeout     string `yaml:"grpcTimeout"`
	MaxBatchItems   int    `yaml:"maxBatchItems"`
	MaxBatchBytesKB int    `yaml:"maxBatchBytesKb"`
	AuthTokenEnv    string `yaml:"authTokenEnv"`
}

type RegistrationConfig struct {
	Enabled             bool   `yaml:"enabled"`
	Endpoint            string `yaml:"endpoint"`
	TLSEnabled          bool   `yaml:"tlsEnabled"`
	CACertPath          string `yaml:"caCertPath"`
	ServerName          string `yaml:"serverName"`
	ClientCertPath      string `yaml:"clientCertPath"`
	ClientKeyPath       string `yaml:"clientKeyPath"`
	BootstrapToken      string `yaml:"bootstrapToken"`
	SharedConfigPath    string `yaml:"sharedConfigPath"`
	CredentialStatePath string `yaml:"credentialStatePath"`
	DeviceType          string `yaml:"deviceType"`
	Timeout             string `yaml:"timeout"`
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

type DockerConfig struct {
	Endpoint             string `yaml:"endpoint"`
	Timeout              string `yaml:"timeout"`
	CollectStopped       bool   `yaml:"collectStopped"`
	EnableServiceRollups bool   `yaml:"enableServiceRollups"`
}

type LHMConfig struct {
	Endpoint            string `yaml:"endpoint"`
	Timeout             string `yaml:"timeout"`
	FingerprintInterval string `yaml:"fingerprintInterval"`
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
	Hostname                   string
	AgentID                    string
	AgentName                  string
	AgentSourceType            string
	NodeID                     string
	NodeName                   string
	PrimaryNICHint             string
	OSProduct                  string
	HardwareSerial             string
	Vendor                     string
	Model                      string
	CPUArchitecture            string
	LogicalCPUCount            int
	AuthToken                  string
	MetricConfigPath           string
	EnabledSources             []string
	RegistrationEnabled        bool
	RegistrationEndpoint       string
	RegistrationTimeout        time.Duration
	RegistrationStatePath      string
	RegistrationDeviceType     string
	RegistrationToken          string
	RegistrationConfigPath     string
	RegistrationTLSEnabled     bool
	RegistrationCACertPath     string
	RegistrationServerName     string
	RegistrationClientCertPath string
	RegistrationClientKeyPath  string
	ScrapeInterval             time.Duration
	ScrapeTimeout              time.Duration
	SendInterval               time.Duration
	SendTimeout                time.Duration
	GRPCSendTimeout            time.Duration
	RetryMinBackoff            time.Duration
	RetryMaxBackoff            time.Duration
	DockerTimeout              time.Duration
	LHMTimeout                 time.Duration
	LHMFingerprintInterval     time.Duration
	SendTransport              string
}
