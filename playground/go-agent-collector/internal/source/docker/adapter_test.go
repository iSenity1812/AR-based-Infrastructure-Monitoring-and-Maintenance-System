package docker

import (
	"context"
	"encoding/json"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/docker/docker/api/types"
	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/go-connections/nat"
	"github.com/iSenity1812/go-agent-collector/internal/config"
)

type fakeDockerClient struct {
	containers  []types.Container
	inspectByID map[string]types.ContainerJSON
	statsByID   map[string]containertypes.StatsResponse
}

func (f *fakeDockerClient) ContainerList(context.Context, containertypes.ListOptions) ([]types.Container, error) {
	return append([]types.Container(nil), f.containers...), nil
}

func (f *fakeDockerClient) ContainerInspect(_ context.Context, containerID string) (types.ContainerJSON, error) {
	return f.inspectByID[containerID], nil
}

func (f *fakeDockerClient) ContainerStats(_ context.Context, containerID string, _ bool) (containertypes.StatsResponseReader, error) {
	payload, err := json.Marshal(f.statsByID[containerID])
	if err != nil {
		return containertypes.StatsResponseReader{}, err
	}
	return containertypes.StatsResponseReader{
		Body: io.NopCloser(strings.NewReader(string(payload))),
	}, nil
}

func TestResolveServiceNamePrefersComposeLabel(t *testing.T) {
	summary := types.Container{
		ID:    "container-1",
		Image: "demo/api:1.0.0",
		Names: []string{"/api-1"},
	}
	inspect := types.ContainerJSON{
		Config: &containertypes.Config{
			Labels: map[string]string{
				labelComposeService:      "compose-api",
				"service":                "service-label",
				"app":                    "app-label",
				"app.kubernetes.io/name": "k8s-app",
			},
		},
	}

	if got := resolveServiceName(summary, inspect); got != "compose-api" {
		t.Fatalf("expected compose label to win, got %q", got)
	}
}

func TestResolveServiceNameFallsBackToNormalizedContainerNameAndImage(t *testing.T) {
	summary := types.Container{
		ID:    "container-1",
		Image: "library/redis:7",
		Names: []string{"/redis_1"},
	}

	if got := resolveServiceName(summary, types.ContainerJSON{}); got != "redis" {
		t.Fatalf("expected normalized container name fallback, got %q", got)
	}

	noNameSummary := types.Container{
		ID:    "container-2",
		Image: "example/backend:2.0.0",
	}
	if got := resolveServiceName(noNameSummary, types.ContainerJSON{}); got != "backend" {
		t.Fatalf("expected image fallback, got %q", got)
	}
}

func TestCollectEmitsContainerAndServiceMetrics(t *testing.T) {
	cfg := &config.Config{
		Runtime: config.RuntimeConfig{
			NodeID:        "node-laptop-01",
			Hostname:      "demo-host",
			DockerTimeout: 3 * time.Second,
		},
		Docker: config.DockerConfig{
			CollectStopped:       true,
			EnableServiceRollups: true,
		},
		DockerMetrics: []config.MetricRule{
			{Key: "container.name", Enabled: true},
			{Key: "container.service_name", Enabled: true},
			{Key: "container.cpu_usage_pct", Enabled: true},
			{Key: "container.memory_used_bytes", Enabled: true},
			{Key: "container.memory_used_pct", Enabled: true},
			{Key: "container.memory_limit_bytes", Enabled: true},
			{Key: "container.network_rx_bytes_sec", Enabled: true},
			{Key: "container.network_tx_bytes_sec", Enabled: true},
			{Key: "container.block_read_bytes_sec", Enabled: true},
			{Key: "container.block_write_bytes_sec", Enabled: true},
			{Key: "container.pid_count", Enabled: true},
			{Key: "container.port_binding_count", Enabled: true},
			{Key: "container.mount_count", Enabled: true},
			{Key: "container.network_count", Enabled: true},
			{Key: "service.container_count", Enabled: true},
			{Key: "service.running_container_count", Enabled: true},
			{Key: "service.cpu_usage_pct_sum", Enabled: true},
			{Key: "service.memory_used_bytes_sum", Enabled: true},
		},
	}

	containerID := "container-1"
	readTime := time.Date(2026, 6, 4, 10, 0, 0, 0, time.UTC)
	fakeClient := &fakeDockerClient{
		containers: []types.Container{
			{
				ID:     containerID,
				Image:  "demo/api:1.0.0",
				Names:  []string{"/api-1"},
				Status: "Up 10 seconds",
			},
		},
		inspectByID: map[string]types.ContainerJSON{
			containerID: {
				Config: &containertypes.Config{
					Labels: map[string]string{
						labelComposeService: "api",
						labelComposeProject: "demo",
					},
				},
				ContainerJSONBase: &types.ContainerJSONBase{
					Name:         "/api-1",
					RestartCount: 2,
					State: &types.ContainerState{
						Running: true,
						Status:  "running",
						Health:  &types.Health{Status: "healthy"},
					},
				},
				NetworkSettings: &types.NetworkSettings{
					NetworkSettingsBase: containertypes.NetworkSettingsBase{
						Ports: nat.PortMap{
							nat.Port("80/tcp"): []nat.PortBinding{{HostPort: "8080"}},
						},
					},
					Networks: map[string]*network.EndpointSettings{
						"bridge": {},
					},
				},
				Mounts: []types.MountPoint{{Destination: "/data"}},
			},
		},
		statsByID: map[string]containertypes.StatsResponse{
			containerID: {
				Read: readTime,
				CPUStats: containertypes.CPUStats{
					CPUUsage: containertypes.CPUUsage{
						TotalUsage:  300,
						PercpuUsage: []uint64{150, 150},
					},
					SystemUsage: 400,
					OnlineCPUs:  2,
				},
				PreCPUStats: containertypes.CPUStats{
					CPUUsage: containertypes.CPUUsage{
						TotalUsage: 100,
					},
					SystemUsage: 200,
				},
				MemoryStats: containertypes.MemoryStats{
					Usage: 512,
					Limit: 1024,
				},
				Networks: map[string]containertypes.NetworkStats{
					"bridge": {
						RxBytes: 2048,
						TxBytes: 1024,
					},
				},
				BlkioStats: containertypes.BlkioStats{
					IoServiceBytesRecursive: []containertypes.BlkioStatEntry{
						{Op: "Read", Value: 4096},
						{Op: "Write", Value: 2048},
					},
				},
				PidsStats: containertypes.PidsStats{Current: 8},
			},
		},
	}

	adapter := NewWithClient(cfg, fakeClient)
	metrics, err := adapter.Collect()
	if err != nil {
		t.Fatalf("collect metrics: %v", err)
	}

	if len(metrics) == 0 {
		t.Fatal("expected docker metrics to be emitted")
	}

	assertMetric := func(name, scopeType, scopeID string) {
		t.Helper()
		for _, metric := range metrics {
			if metric.Name == name && metric.ScopeType == scopeType && metric.ScopeID == scopeID {
				if metric.Source != sourceName {
					t.Fatalf("expected source %q for metric %s, got %q", sourceName, name, metric.Source)
				}
				return
			}
		}
		t.Fatalf("expected metric %s with scope %s/%s", name, scopeType, scopeID)
	}

	assertMetric("container.name", "container", containerID)
	assertMetric("container.cpu_usage_pct", "container", containerID)
	assertMetric("container.port_binding_count", "container", containerID)
	assertMetric("service.container_count", "service", "api")
	assertMetric("service.memory_used_bytes_sum", "service", "api")
}
