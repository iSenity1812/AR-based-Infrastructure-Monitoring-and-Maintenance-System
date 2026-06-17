package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/hostmeta"
	"gopkg.in/yaml.v3"
)

const (
	sourceTypeWindowsExporter = "windows_exporter"
	sourceTypeNodeExporter    = "node_exporter"
	sourceTypeDocker          = "docker"
	sourceTypeLHM             = "lhm"
	sourceTypeMultiSource     = "multi_source"
	sendTransportHTTP         = "http"
	sendTransportGRPC         = "grpc"
)

// Load reads YAML config, applies environment overrides, derives runtime
// identity, and validates the final resolved configuration.
func Load(baseDir string) (*Config, error) {
	root, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, fmt.Errorf("resolve base dir: %w", err)
	}

	cfg := &Config{
		BaseDir:   root,
		ConfigDir: filepath.Join(root, "configs"),
		EnvFile:   filepath.Join(root, ".env"),
	}

	if err := loadDotEnv(cfg.EnvFile); err != nil {
		return nil, err
	}
	if err := mergeYAML(filepath.Join(cfg.ConfigDir, "agent.yaml"), cfg); err != nil {
		return nil, err
	}
	if err := mergeYAML(filepath.Join(cfg.ConfigDir, "assets.yaml"), cfg); err != nil {
		return nil, err
	}

	enabledSources := resolveEnabledSources(cfg)
	cfg.Runtime.EnabledSources = enabledSources

	metricPaths, err := metricConfigPaths(cfg.ConfigDir, enabledSources)
	if err != nil {
		return nil, err
	}
	for _, metricPath := range metricPaths {
		if err := mergeYAML(metricPath, cfg); err != nil {
			return nil, err
		}
	}
	cfg.Runtime.MetricConfigPath = strings.Join(metricPaths, ";")

	if err := cfg.resolve(); err != nil {
		return nil, err
	}
	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func mergeYAML(path string, target any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	if err := yaml.Unmarshal(data, target); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	return nil
}

func metricConfigPaths(configDir string, enabledSources []string) ([]string, error) {
	paths := make([]string, 0, len(enabledSources))
	for _, sourceType := range enabledSources {
		switch sourceType {
		case sourceTypeWindowsExporter:
			paths = append(paths, filepath.Join(configDir, "metrics.windows.yaml"))
		case sourceTypeNodeExporter:
			paths = append(paths, filepath.Join(configDir, "metrics.linux.yaml"))
		case sourceTypeDocker:
			paths = append(paths, filepath.Join(configDir, "metrics.docker.yaml"))
		case sourceTypeLHM:
			paths = append(paths, filepath.Join(configDir, "metrics.lhm.yaml"))
		default:
			return nil, fmt.Errorf("unsupported sourceType %q", sourceType)
		}
	}
	return paths, nil
}

func resolveEnabledSources(cfg *Config) []string {
	if len(cfg.Sources.Enabled) > 0 {
		seen := make(map[string]struct{}, len(cfg.Sources.Enabled))
		sources := make([]string, 0, len(cfg.Sources.Enabled))
		for _, sourceType := range cfg.Sources.Enabled {
			trimmed := strings.TrimSpace(sourceType)
			if trimmed == "" {
				continue
			}
			if _, exists := seen[trimmed]; exists {
				continue
			}
			seen[trimmed] = struct{}{}
			sources = append(sources, trimmed)
		}
		if len(sources) > 0 {
			return sources
		}
	}
	return []string{cfg.Agent.SourceType}
}

func (c *Config) resolve() error {
	hostname, err := resolveHostname(c.Agent.Identity.HostnameEnv, c.Node.HostnameEnv)
	if err != nil {
		return err
	}
	c.Runtime.Hostname = hostname
	if strings.TrimSpace(c.Node.Hostname) == "" {
		c.Node.Hostname = hostname
	}

	c.Runtime.AgentID = firstNonEmpty(
		readEnv(c.Agent.Identity.AgentIDEnv),
		c.Agent.Identity.AgentID,
		deriveName(c.Agent.Identity.AgentIDStrategy, c.Agent.Identity.AgentIDPrefix, hostname),
	)
	c.Agent.Identity.AgentID = c.Runtime.AgentID

	c.Runtime.AgentName = firstNonEmpty(
		readEnv(c.Agent.Identity.AgentNameEnv),
		c.Agent.Identity.AgentName,
		deriveName(c.Agent.Identity.AgentNameStrat, "", hostname),
	)
	c.Agent.Identity.AgentName = c.Runtime.AgentName

	c.Runtime.NodeID = firstNonEmpty(
		readEnv(c.Node.NodeIDEnv),
		c.Node.NodeID,
		deriveName(c.Node.NodeIDStrategy, c.Node.NodeIDPrefix, hostname),
	)
	c.Node.NodeID = c.Runtime.NodeID

	c.Runtime.NodeName = firstNonEmpty(
		readEnv(c.Node.NodeNameEnv),
		c.Node.NodeName,
		deriveName(c.Node.NodeNameStrat, "", hostname),
	)
	c.Node.NodeName = c.Runtime.NodeName

	c.Runtime.PrimaryNICHint = firstNonEmpty(
		readEnv(c.Network.PrimaryNICEnv),
		c.Network.PrimaryNICHint,
	)
	c.Network.PrimaryNICHint = c.Runtime.PrimaryNICHint
	staticMeta := hostmeta.LoadStatic()
	c.Runtime.OSProduct = staticMeta.OSProduct
	c.Runtime.HardwareSerial = staticMeta.HardwareSerial
	c.Runtime.Vendor = staticMeta.Vendor
	c.Runtime.Model = staticMeta.Model
	c.Runtime.CPUArchitecture = staticMeta.CPUArchitecture
	c.Runtime.LogicalCPUCount = staticMeta.LogicalCPUCount
	c.Runtime.AuthToken = readEnv(c.Send.AuthTokenEnv)
	c.Runtime.AgentSourceType = c.Agent.SourceType
	c.Runtime.SendTransport = normalizedSendTransport(c.Send.Transport)
	c.Runtime.RegistrationEnabled = c.Registration.Enabled
	if !c.Runtime.RegistrationEnabled {
		c.Runtime.RegistrationEnabled = true
	}
	if strings.TrimSpace(c.Registration.Endpoint) == "" {
		c.Registration.Endpoint = "127.0.0.1:8443"
	}
	if !c.Registration.TLSEnabled {
		c.Registration.TLSEnabled = true
	}
	if strings.TrimSpace(c.Registration.CACertPath) == "" {
		c.Registration.CACertPath = filepath.Join(
			c.BaseDir,
			"..",
			"..",
			"backend",
			"apps",
			"ingestion-worker",
			"deployment",
			"local-ca",
			"pki",
			"ca.crt",
		)
	}
	if strings.TrimSpace(c.Registration.ServerName) == "" {
		c.Registration.ServerName = "local-ingestion.local"
	}
	if strings.TrimSpace(c.Registration.CredentialStatePath) == "" {
		c.Registration.CredentialStatePath = filepath.Join(
			c.BaseDir,
			"data",
			"registration",
			"registration-state.json",
		)
	}
	if strings.TrimSpace(c.Registration.ClientCertPath) == "" {
		c.Registration.ClientCertPath = filepath.Join(
			filepath.Dir(c.Registration.CredentialStatePath),
			"client.crt",
		)
	}
	if strings.TrimSpace(c.Registration.ClientKeyPath) == "" {
		c.Registration.ClientKeyPath = filepath.Join(
			filepath.Dir(c.Registration.CredentialStatePath),
			"client.key",
		)
	}
	if strings.TrimSpace(c.Registration.SharedConfigPath) == "" {
		c.Registration.SharedConfigPath = filepath.Join(
			c.BaseDir,
			"..",
			"..",
			"backend",
			"apps",
			"ingestion-worker",
			"config",
			"config.yaml",
		)
	}
	if strings.TrimSpace(c.Registration.DeviceType) == "" {
		c.Registration.DeviceType = "WORKSTATION"
	}
	if strings.TrimSpace(c.Registration.Timeout) == "" {
		c.Registration.Timeout = "15s"
	}
	c.Runtime.RegistrationEndpoint = c.Registration.Endpoint
	c.Runtime.RegistrationStatePath = c.Registration.CredentialStatePath
	c.Runtime.RegistrationDeviceType = c.Registration.DeviceType
	c.Runtime.RegistrationToken = c.Registration.BootstrapToken
	c.Runtime.RegistrationConfigPath = c.Registration.SharedConfigPath
	c.Runtime.RegistrationTLSEnabled = c.Registration.TLSEnabled
	c.Runtime.RegistrationCACertPath = c.Registration.CACertPath
	c.Runtime.RegistrationServerName = c.Registration.ServerName
	c.Runtime.RegistrationClientCertPath = c.Registration.ClientCertPath
	c.Runtime.RegistrationClientKeyPath = c.Registration.ClientKeyPath
	if len(c.Runtime.EnabledSources) > 1 {
		c.Runtime.AgentSourceType = sourceTypeMultiSource
	}

	if c.Runtime.ScrapeInterval, err = time.ParseDuration(c.Scrape.Interval); err != nil {
		return fmt.Errorf("parse scrape.interval: %w", err)
	}
	if c.Runtime.ScrapeTimeout, err = time.ParseDuration(c.Scrape.Timeout); err != nil {
		return fmt.Errorf("parse scrape.timeout: %w", err)
	}
	if c.Runtime.SendInterval, err = time.ParseDuration(c.Send.Interval); err != nil {
		return fmt.Errorf("parse send.interval: %w", err)
	}
	if c.Runtime.SendTimeout, err = time.ParseDuration(c.Send.Timeout); err != nil {
		return fmt.Errorf("parse send.timeout: %w", err)
	}
	grpcTimeout := strings.TrimSpace(c.Send.GRPCTimeout)
	if grpcTimeout == "" {
		grpcTimeout = "15s"
	}
	if c.Runtime.GRPCSendTimeout, err = time.ParseDuration(grpcTimeout); err != nil {
		return fmt.Errorf("parse send.grpcTimeout: %w", err)
	}
	if c.Runtime.RegistrationTimeout, err = time.ParseDuration(c.Registration.Timeout); err != nil {
		return fmt.Errorf("parse registration.timeout: %w", err)
	}
	if c.Runtime.RetryMinBackoff, err = time.ParseDuration(c.Retry.MinBackoff); err != nil {
		return fmt.Errorf("parse retry.minBackoff: %w", err)
	}
	if c.Runtime.RetryMaxBackoff, err = time.ParseDuration(c.Retry.MaxBackoff); err != nil {
		return fmt.Errorf("parse retry.maxBackoff: %w", err)
	}
	if strings.TrimSpace(c.Docker.Timeout) == "" {
		c.Docker.Timeout = c.Scrape.Timeout
	}
	if c.Runtime.DockerTimeout, err = time.ParseDuration(c.Docker.Timeout); err != nil {
		return fmt.Errorf("parse docker.timeout: %w", err)
	}
	if strings.TrimSpace(c.LHM.Endpoint) == "" {
		c.LHM.Endpoint = "http://localhost:8085/data.json"
	}
	if strings.TrimSpace(c.LHM.Timeout) == "" {
		c.LHM.Timeout = c.Scrape.Timeout
	}
	if c.Runtime.LHMTimeout, err = time.ParseDuration(c.LHM.Timeout); err != nil {
		return fmt.Errorf("parse lhm.timeout: %w", err)
	}
	if strings.TrimSpace(c.LHM.FingerprintInterval) == "" {
		c.LHM.FingerprintInterval = "120s"
	}
	if c.Runtime.LHMFingerprintInterval, err = time.ParseDuration(c.LHM.FingerprintInterval); err != nil {
		return fmt.Errorf("parse lhm.fingerprintInterval: %w", err)
	}
	if !c.Docker.CollectStopped {
		c.Docker.CollectStopped = false
	}

	return nil
}

func (c *Config) validate() error {
	var problems []string

	if c.Agent.SchemaVersion == "" {
		problems = append(problems, "agent.schemaVersion is required")
	}
	if c.Agent.SourceType != sourceTypeWindowsExporter && c.Agent.SourceType != sourceTypeNodeExporter && c.Agent.SourceType != sourceTypeDocker && c.Agent.SourceType != sourceTypeLHM {
		problems = append(problems, "agent.sourceType must be windows_exporter, node_exporter, docker, or lhm")
	}
	if err := validateURL("scrape.endpoint", c.Scrape.Endpoint); err != nil {
		problems = append(problems, err.Error())
	}
	if c.Runtime.SendTransport == sendTransportGRPC {
		if err := validateGRPCEndpoint("send.endpoint", c.Send.Endpoint); err != nil {
			problems = append(problems, err.Error())
		}
	} else {
		if err := validateURL("send.endpoint", c.Send.Endpoint); err != nil {
			problems = append(problems, err.Error())
		}
	}
	if c.Runtime.ScrapeInterval <= 0 {
		problems = append(problems, "scrape.interval must be > 0")
	}
	if c.Runtime.ScrapeTimeout <= 0 {
		problems = append(problems, "scrape.timeout must be > 0")
	}
	if c.Runtime.SendInterval <= 0 {
		problems = append(problems, "send.interval must be > 0")
	}
	if c.Runtime.SendTimeout <= 0 {
		problems = append(problems, "send.timeout must be > 0")
	}
	if c.Runtime.GRPCSendTimeout <= 0 {
		problems = append(problems, "send.grpcTimeout must be > 0")
	}
	if c.Runtime.RegistrationEnabled {
		if err := validateGRPCEndpoint(
			"registration.endpoint",
			c.Runtime.RegistrationEndpoint,
		); err != nil {
			problems = append(problems, err.Error())
		}
		if c.Runtime.RegistrationTLSEnabled && strings.TrimSpace(c.Runtime.RegistrationCACertPath) == "" {
			problems = append(
				problems,
				"registration.caCertPath is required when registration.tlsEnabled=true",
			)
		}
		if c.Runtime.RegistrationTLSEnabled {
			if _, err := os.Stat(c.Runtime.RegistrationClientCertPath); err == nil {
				if _, err := os.Stat(c.Runtime.RegistrationClientKeyPath); err != nil {
					problems = append(
						problems,
						"registration.clientKeyPath must exist when client cert is present",
					)
				}
			}
		}
		if c.Runtime.RegistrationTimeout <= 0 {
			problems = append(
				problems,
				"registration.timeout must be > 0 when registration.enabled=true",
			)
		}
	}
	if c.Runtime.RetryMinBackoff <= 0 {
		problems = append(problems, "retry.minBackoff must be > 0")
	}
	if c.Runtime.RetryMaxBackoff <= 0 {
		problems = append(problems, "retry.maxBackoff must be > 0")
	}
	if c.Runtime.RetryMaxBackoff < c.Runtime.RetryMinBackoff {
		problems = append(problems, "retry.maxBackoff must be >= retry.minBackoff")
	}
	if c.Runtime.DockerTimeout <= 0 {
		problems = append(problems, "docker.timeout must be > 0")
	}
	if c.Runtime.LHMTimeout <= 0 {
		problems = append(problems, "lhm.timeout must be > 0")
	}
	if c.Runtime.LHMFingerprintInterval <= 0 {
		problems = append(problems, "lhm.fingerprintInterval must be > 0")
	}
	if c.Scrape.MaxBodySizeMB <= 0 {
		problems = append(problems, "scrape.maxBodySizeMb must be > 0")
	}
	if c.Send.MaxBatchItems <= 0 {
		problems = append(problems, "send.maxBatchItems must be > 0")
	}
	if c.Send.MaxBatchBytesKB <= 0 {
		problems = append(problems, "send.maxBatchBytesKb must be > 0")
	}
	if c.Buffer.Enabled {
		if strings.TrimSpace(c.Buffer.Path) == "" {
			problems = append(problems, "buffer.path is required when buffer.enabled=true")
		}
		if c.Buffer.MaxSizeMB <= 0 {
			problems = append(problems, "buffer.maxSizeMb must be > 0 when buffer.enabled=true")
		}
		if c.Buffer.MaxBatchFiles <= 0 {
			problems = append(problems, "buffer.maxBatchFiles must be > 0 when buffer.enabled=true")
		}
	}
	if c.Queue.MaxRecords <= 0 {
		problems = append(problems, "queue.maxRecords must be > 0")
	}
	if c.Features.LocalHealthEndpoint && strings.TrimSpace(c.Observability.HealthAddress) == "" {
		problems = append(problems, "observability.healthAddress is required when features.localHealthEndpoint=true")
	}
	if strings.TrimSpace(c.Runtime.AgentID) == "" {
		problems = append(problems, "resolved agent id is empty")
	}
	if strings.TrimSpace(c.Runtime.AgentName) == "" {
		problems = append(problems, "resolved agent name is empty")
	}
	if strings.TrimSpace(c.Runtime.NodeID) == "" {
		problems = append(problems, "resolved node id is empty")
	}
	if strings.TrimSpace(c.Runtime.NodeName) == "" {
		problems = append(problems, "resolved node name is empty")
	}
	if strings.TrimSpace(c.Node.Hostname) == "" {
		problems = append(problems, "resolved hostname is empty")
	}
	if len(c.Runtime.EnabledSources) == 0 {
		problems = append(problems, "sources.enabled must resolve to at least one source")
	}
	if c.Runtime.SendTransport != sendTransportHTTP && c.Runtime.SendTransport != sendTransportGRPC {
		problems = append(problems, "send.transport must be http or grpc")
	}

	windowsEnabled := hasEnabledSource(c.Runtime.EnabledSources, sourceTypeWindowsExporter)
	dockerEnabled := hasEnabledSource(c.Runtime.EnabledSources, sourceTypeDocker)
	nodeExporterEnabled := hasEnabledSource(c.Runtime.EnabledSources, sourceTypeNodeExporter)
	lhmEnabled := hasEnabledSource(c.Runtime.EnabledSources, sourceTypeLHM)

	if windowsEnabled && len(c.Metrics) == 0 {
		problems = append(problems, "metrics list is empty for windows_exporter")
	}
	if dockerEnabled && len(c.DockerMetrics) == 0 {
		problems = append(problems, "dockerMetrics list is empty for docker")
	}
	if lhmEnabled {
		if err := validateURL("lhm.endpoint", c.LHM.Endpoint); err != nil {
			problems = append(problems, err.Error())
		}
		if len(c.LHMMetrics) == 0 {
			problems = append(problems, "lhmMetrics list is empty for lhm")
		}
	}
	if nodeExporterEnabled {
		problems = append(problems, "node_exporter is documented but not implemented yet")
	}

	seenKeys := map[string]struct{}{}
	for i, metric := range c.Metrics {
		problems = append(problems, validateMetricRule(metric, fmt.Sprintf("metrics[%d]", i), seenKeys)...)
	}

	for i, metric := range c.DockerMetrics {
		problems = append(problems, validateMetricRule(metric, fmt.Sprintf("dockerMetrics[%d]", i), seenKeys)...)
	}
	for i, metric := range c.LHMMetrics {
		problems = append(problems, validateMetricRule(metric, fmt.Sprintf("lhmMetrics[%d]", i), seenKeys)...)
	}

	if len(problems) > 0 {
		return errors.New("config validation failed:\n - " + strings.Join(problems, "\n - "))
	}
	return nil
}

func validateMetricRule(metric MetricRule, path string, seenKeys map[string]struct{}) []string {
	var problems []string
	if strings.TrimSpace(metric.Key) == "" {
		problems = append(problems, path+".key is required")
	}
	if strings.TrimSpace(metric.Category) == "" {
		problems = append(problems, path+".category is required")
	}
	if strings.TrimSpace(metric.ScopeType) == "" {
		problems = append(problems, path+".scopeType is required")
	}
	if strings.TrimSpace(metric.ValueType) == "" {
		problems = append(problems, path+".valueType is required")
	}
	if strings.TrimSpace(metric.Aggregation) == "" {
		problems = append(problems, path+".aggregation is required")
	}
	if len(metric.SourceMetric) == 0 {
		problems = append(problems, path+".sourceMetric is required")
	}
	if _, exists := seenKeys[metric.Key]; exists {
		problems = append(problems, path+".key must be unique")
	}
	seenKeys[metric.Key] = struct{}{}
	return problems
}

func hasEnabledSource(sources []string, expected string) bool {
	for _, sourceType := range sources {
		if sourceType == expected {
			return true
		}
	}
	return false
}

func validateURL(name, value string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(value))
	if err != nil {
		return fmt.Errorf("%s must be a valid URL: %w", name, err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("%s must start with http:// or https://", name)
	}
	return nil
}

func validateGRPCEndpoint(name, value string) error {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fmt.Errorf("%s is required", name)
	}
	if strings.Contains(trimmed, "://") {
		return fmt.Errorf("%s must be host:port for grpc transport", name)
	}
	if !strings.Contains(trimmed, ":") {
		return fmt.Errorf("%s must include host:port for grpc transport", name)
	}
	return nil
}

func normalizedSendTransport(value string) string {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return sendTransportHTTP
	}
	return trimmed
}

func resolveHostname(names ...string) (string, error) {
	candidates := append([]string{}, names...)
	candidates = append(candidates, "COMPUTERNAME", "HOSTNAME")
	for _, name := range candidates {
		if value := readEnv(name); value != "" {
			return value, nil
		}
	}

	value, err := os.Hostname()
	if err != nil {
		return "", fmt.Errorf("resolve hostname: %w", err)
	}
	if strings.TrimSpace(value) == "" {
		return "", errors.New("resolve hostname: empty hostname")
	}
	return value, nil
}

func deriveName(strategy, prefix, hostname string) string {
	base := hostname
	switch strings.TrimSpace(strategy) {
	case "", "hostname":
		base = hostname
	case "hostname_slug":
		base = slugify(hostname)
	default:
		base = hostname
	}
	if prefix == "" {
		return base
	}
	return prefix + "-" + base
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var b strings.Builder
	lastDash := false
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
			b.WriteRune(r)
			lastDash = false
		case r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash && b.Len() > 0 {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}

	out := strings.Trim(b.String(), "-")
	if out == "" {
		return "unknown-host"
	}
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
