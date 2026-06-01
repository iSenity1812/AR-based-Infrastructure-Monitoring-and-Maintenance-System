package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

const (
	sourceTypeWindowsExporter = "windows_exporter"
	sourceTypeNodeExporter    = "node_exporter"
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

	metricPath, err := metricConfigPath(cfg.ConfigDir, cfg.Agent.SourceType)
	if err != nil {
		return nil, err
	}
	if err := mergeYAML(metricPath, cfg); err != nil {
		return nil, err
	}
	cfg.Runtime.MetricConfigPath = metricPath

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

func metricConfigPath(configDir, sourceType string) (string, error) {
	switch sourceType {
	case sourceTypeWindowsExporter:
		return filepath.Join(configDir, "metrics.windows.yaml"), nil
	case sourceTypeNodeExporter:
		return filepath.Join(configDir, "metrics.linux.yaml"), nil
	default:
		return "", fmt.Errorf("unsupported sourceType %q", sourceType)
	}
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
	c.Runtime.AuthToken = readEnv(c.Send.AuthTokenEnv)

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
	if c.Runtime.RetryMinBackoff, err = time.ParseDuration(c.Retry.MinBackoff); err != nil {
		return fmt.Errorf("parse retry.minBackoff: %w", err)
	}
	if c.Runtime.RetryMaxBackoff, err = time.ParseDuration(c.Retry.MaxBackoff); err != nil {
		return fmt.Errorf("parse retry.maxBackoff: %w", err)
	}

	return nil
}

func (c *Config) validate() error {
	var problems []string

	if c.Agent.SchemaVersion == "" {
		problems = append(problems, "agent.schemaVersion is required")
	}
	if c.Agent.SourceType != sourceTypeWindowsExporter && c.Agent.SourceType != sourceTypeNodeExporter {
		problems = append(problems, "agent.sourceType must be windows_exporter or node_exporter")
	}
	if err := validateURL("scrape.endpoint", c.Scrape.Endpoint); err != nil {
		problems = append(problems, err.Error())
	}
	if err := validateURL("send.endpoint", c.Send.Endpoint); err != nil {
		problems = append(problems, err.Error())
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
	if c.Runtime.RetryMinBackoff <= 0 {
		problems = append(problems, "retry.minBackoff must be > 0")
	}
	if c.Runtime.RetryMaxBackoff <= 0 {
		problems = append(problems, "retry.maxBackoff must be > 0")
	}
	if c.Runtime.RetryMaxBackoff < c.Runtime.RetryMinBackoff {
		problems = append(problems, "retry.maxBackoff must be >= retry.minBackoff")
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
	if len(c.Metrics) == 0 {
		problems = append(problems, "metrics list is empty")
	}

	seenKeys := map[string]struct{}{}
	for i, metric := range c.Metrics {
		path := fmt.Sprintf("metrics[%d]", i)
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
	}

	if len(problems) > 0 {
		return errors.New("config validation failed:\n - " + strings.Join(problems, "\n - "))
	}
	return nil
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
