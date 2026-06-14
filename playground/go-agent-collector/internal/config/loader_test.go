package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadAppliesEnvOverrideAndDerive(t *testing.T) {
	root := t.TempDir()
	configDir := filepath.Join(root, "configs")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir configs: %v", err)
	}

	writeTestFile(t, filepath.Join(root, ".env"), "GO_AGENT_NAME=env-agent\n")
	writeTestFile(t, filepath.Join(configDir, "agent.yaml"), strings.TrimSpace(`
agent:
  schemaVersion: v1
  sourceType: windows_exporter
  mode: service
  agentVersion: 0.1.0
  identity:
    agentId: ""
    agentName: ""
    agentIdEnv: GO_AGENT_ID
    agentNameEnv: GO_AGENT_NAME
    agentIdStrategy: hostname_slug
    agentNameStrategy: hostname
    agentIdPrefix: agent
    hostnameEnv: TEST_HOSTNAME
scrape:
  endpoint: http://localhost:9182/metrics
  interval: 5s
  timeout: 3s
  maxBodySizeMb: 8
send:
  endpoint: http://localhost:8090/api/telemetry/ingest
  interval: 5s
  timeout: 5s
  maxBatchItems: 100
  maxBatchBytesKb: 512
  authTokenEnv: GO_AGENT_API_TOKEN
retry:
  minBackoff: 1s
  maxBackoff: 30s
  maxAttempts: 0
  retryableStatusCodes: [503]
buffer:
  enabled: false
  path: data/buffer
  maxSizeMb: 50
  maxBatchFiles: 100
  overflowPolicy: drop_oldest
queue:
  maxRecords: 100
  overflowPolicy: drop_oldest
logging:
  level: info
  format: json
  output: stdout
observability:
  healthAddress: 127.0.0.1:9101
features:
  configReload: false
  localHealthEndpoint: false
  internalMetrics: true
  linuxAdapter: false
`))
	writeTestFile(t, filepath.Join(configDir, "assets.yaml"), strings.TrimSpace(`
node:
  nodeId: ""
  nodeName: ""
  hostname: ""
  nodeIdEnv: GO_NODE_ID
  nodeNameEnv: GO_NODE_NAME
  hostnameEnv: TEST_HOSTNAME
  nodeIdStrategy: hostname_slug
  nodeNameStrategy: hostname
  nodeIdPrefix: node
  deviceType: laptop
topology:
  rackId: rack-a1
  switchId: sw-a1
  site: lab-local
  environment: poc
network:
  primaryUplink: wifi
  primaryNicHint: ""
  primaryNicEnv: GO_PRIMARY_NIC
  excludeNicPatterns: ["Loopback"]
tags:
  ownerTeam: telemetry
  deployment: local-lab
`))
	writeTestFile(t, filepath.Join(configDir, "metrics.windows.yaml"), strings.TrimSpace(`
metrics:
  - category: runtime
    key: node.process_count
    enabled: true
    sourceMetric: windows_system_processes
    scopeType: node
    unit: count
    valueType: gauge
    aggregation: direct
`))

	t.Setenv("TEST_HOSTNAME", "Test Host")
	t.Setenv("GO_AGENT_ID", "env-agent-id")

	cfg, err := Load(root)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.AgentID != "env-agent-id" {
		t.Fatalf("expected env override agent id, got %s", cfg.Runtime.AgentID)
	}
	if cfg.Runtime.AgentName != "env-agent" {
		t.Fatalf("expected .env override agent name, got %s", cfg.Runtime.AgentName)
	}
	if cfg.Runtime.NodeID != "node-test-host" {
		t.Fatalf("expected derived node id, got %s", cfg.Runtime.NodeID)
	}
}

func TestLoadValidatesHealthAddressWhenEndpointEnabled(t *testing.T) {
	root := t.TempDir()
	configDir := filepath.Join(root, "configs")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir configs: %v", err)
	}

	writeTestFile(t, filepath.Join(configDir, "agent.yaml"), "agent:\n  schemaVersion: v1\n  sourceType: windows_exporter\n  mode: service\n  agentVersion: 0.1.0\n  identity:\n    agentIdEnv: GO_AGENT_ID\n    agentNameEnv: GO_AGENT_NAME\n    agentIdStrategy: hostname_slug\n    agentNameStrategy: hostname\n    agentIdPrefix: agent\n    hostnameEnv: TEST_HOSTNAME\nscrape:\n  endpoint: http://localhost:9182/metrics\n  interval: 5s\n  timeout: 3s\n  maxBodySizeMb: 8\nsend:\n  endpoint: http://localhost:8080/api/telemetry/ingest\n  interval: 5s\n  timeout: 5s\n  maxBatchItems: 100\n  maxBatchBytesKb: 512\nretry:\n  minBackoff: 1s\n  maxBackoff: 30s\n  maxAttempts: 0\n  retryableStatusCodes: [503]\nbuffer:\n  enabled: false\n  path: data/buffer\n  maxSizeMb: 50\n  maxBatchFiles: 100\n  overflowPolicy: drop_oldest\nqueue:\n  maxRecords: 100\n  overflowPolicy: drop_oldest\nlogging:\n  level: info\n  format: json\n  output: stdout\nobservability:\n  healthAddress: ''\nfeatures:\n  localHealthEndpoint: true\n")
	writeTestFile(t, filepath.Join(configDir, "assets.yaml"), "node:\n  nodeIdEnv: GO_NODE_ID\n  nodeNameEnv: GO_NODE_NAME\n  hostnameEnv: TEST_HOSTNAME\n  nodeIdStrategy: hostname_slug\n  nodeNameStrategy: hostname\n  nodeIdPrefix: node\n  deviceType: laptop\ntopology:\n  rackId: rack-a1\n  switchId: sw-a1\n  site: lab-local\n  environment: poc\nnetwork:\n  primaryUplink: wifi\n  primaryNicEnv: GO_PRIMARY_NIC\n  excludeNicPatterns: []\ntags:\n  ownerTeam: telemetry\n  deployment: local-lab\n")
	writeTestFile(t, filepath.Join(configDir, "metrics.windows.yaml"), "metrics:\n  - category: runtime\n    key: node.process_count\n    enabled: true\n    sourceMetric: windows_system_processes\n    scopeType: node\n    unit: count\n    valueType: gauge\n    aggregation: direct\n")
	t.Setenv("TEST_HOSTNAME", "Test Host")

	_, err := Load(root)
	if err == nil || !strings.Contains(err.Error(), "observability.healthAddress") {
		t.Fatalf("expected observability health address validation error, got %v", err)
	}
}

func TestLoadSupportsMultiSourceWindowsAndDocker(t *testing.T) {
	root := t.TempDir()
	configDir := filepath.Join(root, "configs")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir configs: %v", err)
	}

	writeTestFile(t, filepath.Join(configDir, "agent.yaml"), strings.TrimSpace(`
agent:
  schemaVersion: v1
  sourceType: windows_exporter
  mode: service
  agentVersion: 0.1.0
  identity:
    agentIdEnv: GO_AGENT_ID
    agentNameEnv: GO_AGENT_NAME
    agentIdStrategy: hostname_slug
    agentNameStrategy: hostname
    agentIdPrefix: agent
    hostnameEnv: TEST_HOSTNAME
sources:
  enabled:
    - windows_exporter
    - docker
scrape:
  endpoint: http://localhost:9182/metrics
  interval: 5s
  timeout: 3s
  maxBodySizeMb: 8
docker:
  endpoint: npipe:////./pipe/docker_engine
  timeout: 4s
  collectStopped: true
  enableServiceRollups: true
send:
  endpoint: http://localhost:8090/api/telemetry/ingest
  interval: 5s
  timeout: 5s
  maxBatchItems: 100
  maxBatchBytesKb: 512
  authTokenEnv: GO_AGENT_API_TOKEN
retry:
  minBackoff: 1s
  maxBackoff: 30s
  maxAttempts: 0
  retryableStatusCodes: [503]
buffer:
  enabled: false
  path: data/buffer
  maxSizeMb: 50
  maxBatchFiles: 100
  overflowPolicy: drop_oldest
queue:
  maxRecords: 100
  overflowPolicy: drop_oldest
logging:
  level: info
  format: json
  output: stdout
observability:
  healthAddress: 127.0.0.1:9101
features:
  configReload: false
  localHealthEndpoint: false
  internalMetrics: true
  linuxAdapter: false
`))
	writeTestFile(t, filepath.Join(configDir, "assets.yaml"), strings.TrimSpace(`
node:
  nodeIdEnv: GO_NODE_ID
  nodeNameEnv: GO_NODE_NAME
  hostnameEnv: TEST_HOSTNAME
  nodeIdStrategy: hostname_slug
  nodeNameStrategy: hostname
  nodeIdPrefix: node
  deviceType: laptop
topology:
  rackId: rack-a1
  switchId: sw-a1
  site: lab-local
  environment: poc
network:
  primaryUplink: wifi
  primaryNicEnv: GO_PRIMARY_NIC
  excludeNicPatterns: []
tags:
  ownerTeam: telemetry
  deployment: local-lab
`))
	writeTestFile(t, filepath.Join(configDir, "metrics.windows.yaml"), strings.TrimSpace(`
metrics:
  - category: runtime
    key: node.process_count
    enabled: true
    sourceMetric: windows_system_processes
    scopeType: node
    unit: count
    valueType: gauge
    aggregation: direct
`))
	writeTestFile(t, filepath.Join(configDir, "metrics.docker.yaml"), strings.TrimSpace(`
dockerMetrics:
  - category: inventory
    key: container.name
    enabled: true
    sourceMetric: docker.inspect.name
    scopeType: container
    unit: text
    valueType: text
    aggregation: direct
`))
	t.Setenv("TEST_HOSTNAME", "Test Host")

	cfg, err := Load(root)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.AgentSourceType != sourceTypeMultiSource {
		t.Fatalf("expected runtime source type %q, got %q", sourceTypeMultiSource, cfg.Runtime.AgentSourceType)
	}
	if got := strings.Join(cfg.Runtime.EnabledSources, ","); got != "windows_exporter,docker" {
		t.Fatalf("unexpected enabled sources: %s", got)
	}
	if len(cfg.Metrics) != 1 {
		t.Fatalf("expected 1 windows metric rule, got %d", len(cfg.Metrics))
	}
	if len(cfg.DockerMetrics) != 1 {
		t.Fatalf("expected 1 docker metric rule, got %d", len(cfg.DockerMetrics))
	}
	if cfg.Runtime.DockerTimeout.String() != "4s" {
		t.Fatalf("expected docker timeout 4s, got %s", cfg.Runtime.DockerTimeout)
	}
}

func TestLoadDefaultsGRPCTimeoutAndTransport(t *testing.T) {
	root := t.TempDir()
	configDir := filepath.Join(root, "configs")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir configs: %v", err)
	}

	writeTestFile(t, filepath.Join(configDir, "agent.yaml"), strings.TrimSpace(`
agent:
  schemaVersion: v1
  sourceType: windows_exporter
  mode: service
  agentVersion: 0.1.0
  identity:
    agentIdEnv: GO_AGENT_ID
    agentNameEnv: GO_AGENT_NAME
    agentIdStrategy: hostname_slug
    agentNameStrategy: hostname
    agentIdPrefix: agent
    hostnameEnv: TEST_HOSTNAME
scrape:
  endpoint: http://localhost:9182/metrics
  interval: 5s
  timeout: 3s
  maxBodySizeMb: 8
send:
  transport: grpc
  endpoint: 127.0.0.1:8091
  interval: 5s
  timeout: 5s
  maxBatchItems: 100
  maxBatchBytesKb: 512
retry:
  minBackoff: 1s
  maxBackoff: 30s
  maxAttempts: 0
  retryableStatusCodes: [503]
buffer:
  enabled: false
  path: data/buffer
  maxSizeMb: 50
  maxBatchFiles: 100
  overflowPolicy: drop_oldest
queue:
  maxRecords: 100
  overflowPolicy: drop_oldest
logging:
  level: info
  format: json
  output: stdout
observability:
  healthAddress: 127.0.0.1:9101
features:
  localHealthEndpoint: false
`))
	writeTestFile(t, filepath.Join(configDir, "assets.yaml"), "node:\n  nodeIdEnv: GO_NODE_ID\n  nodeNameEnv: GO_NODE_NAME\n  hostnameEnv: TEST_HOSTNAME\n  nodeIdStrategy: hostname_slug\n  nodeNameStrategy: hostname\n  nodeIdPrefix: node\n  deviceType: laptop\ntopology:\n  rackId: rack-a1\n  switchId: sw-a1\n  site: lab-local\n  environment: poc\nnetwork:\n  primaryUplink: wifi\n  primaryNicEnv: GO_PRIMARY_NIC\n  excludeNicPatterns: []\ntags:\n  ownerTeam: telemetry\n  deployment: local-lab\n")
	writeTestFile(t, filepath.Join(configDir, "metrics.windows.yaml"), "metrics:\n  - category: runtime\n    key: node.process_count\n    enabled: true\n    sourceMetric: windows_system_processes\n    scopeType: node\n    unit: count\n    valueType: gauge\n    aggregation: direct\n")
	t.Setenv("TEST_HOSTNAME", "Test Host")

	cfg, err := Load(root)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.SendTransport != sendTransportGRPC {
		t.Fatalf("expected grpc transport, got %s", cfg.Runtime.SendTransport)
	}
	if cfg.Runtime.GRPCSendTimeout.String() != "15s" {
		t.Fatalf("expected default grpc timeout 15s, got %s", cfg.Runtime.GRPCSendTimeout)
	}
}

func TestLoadSupportsLHMSecondarySource(t *testing.T) {
	root := t.TempDir()
	configDir := filepath.Join(root, "configs")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir configs: %v", err)
	}

	writeTestFile(t, filepath.Join(configDir, "agent.yaml"), strings.TrimSpace(`
agent:
  schemaVersion: v1
  sourceType: windows_exporter
  mode: service
  agentVersion: 0.1.0
  identity:
    agentIdEnv: GO_AGENT_ID
    agentNameEnv: GO_AGENT_NAME
    agentIdStrategy: hostname_slug
    agentNameStrategy: hostname
    agentIdPrefix: agent
    hostnameEnv: TEST_HOSTNAME
sources:
  enabled:
    - windows_exporter
    - lhm
scrape:
  endpoint: http://localhost:9182/metrics
  interval: 15s
  timeout: 3s
  maxBodySizeMb: 8
lhm:
  endpoint: http://localhost:8085/data.json
  timeout: 4s
  fingerprintInterval: 120s
send:
  endpoint: http://localhost:8090/api/telemetry/ingest
  interval: 15s
  timeout: 5s
  maxBatchItems: 100
  maxBatchBytesKb: 512
retry:
  minBackoff: 1s
  maxBackoff: 30s
  maxAttempts: 0
  retryableStatusCodes: [503]
buffer:
  enabled: false
  path: data/buffer
  maxSizeMb: 50
  maxBatchFiles: 100
  overflowPolicy: drop_oldest
queue:
  maxRecords: 100
  overflowPolicy: drop_oldest
logging:
  level: info
  format: json
  output: stdout
observability:
  healthAddress: 127.0.0.1:9101
features:
  localHealthEndpoint: false
`))
	writeTestFile(t, filepath.Join(configDir, "assets.yaml"), "node:\n  nodeIdEnv: GO_NODE_ID\n  nodeNameEnv: GO_NODE_NAME\n  hostnameEnv: TEST_HOSTNAME\n  nodeIdStrategy: hostname_slug\n  nodeNameStrategy: hostname\n  nodeIdPrefix: node\n  deviceType: laptop\ntopology:\n  rackId: rack-a1\n  switchId: sw-a1\n  site: lab-local\n  environment: poc\nnetwork:\n  primaryUplink: wifi\n  primaryNicEnv: GO_PRIMARY_NIC\n  excludeNicPatterns: []\ntags:\n  ownerTeam: telemetry\n  deployment: local-lab\n")
	writeTestFile(t, filepath.Join(configDir, "metrics.windows.yaml"), "metrics:\n  - category: runtime\n    key: node.process_count\n    enabled: true\n    sourceMetric: windows_system_processes\n    scopeType: node\n    unit: count\n    valueType: gauge\n    aggregation: direct\n")
	writeTestFile(t, filepath.Join(configDir, "metrics.lhm.yaml"), "lhmMetrics:\n  - category: hardware_health\n    key: node.cpu_temperature_c\n    enabled: true\n    sourceMetric: lhm.cpu.temperature\n    scopeType: node\n    unit: C\n    valueType: gauge\n    aggregation: direct\n")
	t.Setenv("TEST_HOSTNAME", "Test Host")

	cfg, err := Load(root)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if got := strings.Join(cfg.Runtime.EnabledSources, ","); got != "windows_exporter,lhm" {
		t.Fatalf("unexpected enabled sources: %s", got)
	}
	if len(cfg.LHMMetrics) != 1 {
		t.Fatalf("expected 1 lhm metric rule, got %d", len(cfg.LHMMetrics))
	}
	if cfg.Runtime.LHMTimeout.String() != "4s" {
		t.Fatalf("expected lhm timeout 4s, got %s", cfg.Runtime.LHMTimeout)
	}
	if cfg.Runtime.LHMFingerprintInterval.String() != "2m0s" {
		t.Fatalf("expected lhm fingerprint interval 120s, got %s", cfg.Runtime.LHMFingerprintInterval)
	}
}

func TestLoadRejectsInvalidLHMConfig(t *testing.T) {
	root := t.TempDir()
	configDir := filepath.Join(root, "configs")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir configs: %v", err)
	}

	writeTestFile(t, filepath.Join(configDir, "agent.yaml"), "agent:\n  schemaVersion: v1\n  sourceType: windows_exporter\n  mode: service\n  agentVersion: 0.1.0\n  identity:\n    hostnameEnv: TEST_HOSTNAME\nsources:\n  enabled:\n    - windows_exporter\n    - lhm\nscrape:\n  endpoint: http://localhost:9182/metrics\n  interval: 5s\n  timeout: 3s\n  maxBodySizeMb: 8\nlhm:\n  endpoint: not-a-url\n  timeout: 3s\n  fingerprintInterval: 0s\nsend:\n  endpoint: http://localhost:8090/api/telemetry/ingest\n  interval: 5s\n  timeout: 5s\n  maxBatchItems: 100\n  maxBatchBytesKb: 512\nretry:\n  minBackoff: 1s\n  maxBackoff: 30s\n  maxAttempts: 0\n  retryableStatusCodes: [503]\nbuffer:\n  enabled: false\n  path: data/buffer\n  maxSizeMb: 50\n  maxBatchFiles: 100\n  overflowPolicy: drop_oldest\nqueue:\n  maxRecords: 100\n  overflowPolicy: drop_oldest\nlogging:\n  level: info\n  format: json\n  output: stdout\nobservability:\n  healthAddress: 127.0.0.1:9101\nfeatures:\n  localHealthEndpoint: false\n")
	writeTestFile(t, filepath.Join(configDir, "assets.yaml"), "node:\n  nodeIdStrategy: hostname_slug\n  nodeNameStrategy: hostname\n  nodeIdPrefix: node\n  deviceType: laptop\n")
	writeTestFile(t, filepath.Join(configDir, "metrics.windows.yaml"), "metrics:\n  - category: runtime\n    key: node.process_count\n    enabled: true\n    sourceMetric: windows_system_processes\n    scopeType: node\n    unit: count\n    valueType: gauge\n    aggregation: direct\n")
	writeTestFile(t, filepath.Join(configDir, "metrics.lhm.yaml"), "lhmMetrics:\n  - category: hardware_health\n    key: node.cpu_temperature_c\n    enabled: true\n    sourceMetric: lhm.cpu.temperature\n    scopeType: node\n    unit: C\n    valueType: gauge\n    aggregation: direct\n")
	t.Setenv("TEST_HOSTNAME", "Test Host")

	_, err := Load(root)
	if err == nil || !strings.Contains(err.Error(), "lhm.") {
		t.Fatalf("expected lhm validation error, got %v", err)
	}
}

func writeTestFile(t *testing.T, path, body string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
