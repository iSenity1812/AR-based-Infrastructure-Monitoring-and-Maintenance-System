package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

const (
	sourceName          = "docker"
	sourceInspectPrefix = "docker.inspect"
	sourceStatsPrefix   = "docker.stats"
	labelComposeService = "com.docker.compose.service"
	labelComposeProject = "com.docker.compose.project"
	defaultTextValue    = "unknown"
)

type dockerClient interface {
	ContainerList(ctx context.Context, options containertypes.ListOptions) ([]types.Container, error)
	ContainerInspect(ctx context.Context, containerID string) (types.ContainerJSON, error)
	ContainerStats(ctx context.Context, containerID string, stream bool) (containertypes.StatsResponseReader, error)
}

type counterSnapshot struct {
	at         time.Time
	networkRx  uint64
	networkTx  uint64
	blockRead  uint64
	blockWrite uint64
}

type serviceRollup struct {
	containerCount        float64
	runningContainerCount float64
	cpuUsagePctSum        float64
	memoryUsedBytesSum    float64
}

// Adapter collects Docker workload inventory and one-shot stats.
type Adapter struct {
	cfg            *config.Config
	client         dockerClient
	collectStopped bool
	enableRollups  bool
	enabledKeys    map[string]struct{}
	mu             sync.Mutex
	prevCounters   map[string]counterSnapshot
}

// New returns a Docker source adapter.
func New(cfg *config.Config) *Adapter {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		cli = nil
	}

	return NewWithClient(cfg, cli)
}

// NewWithClient injects a Docker client for tests.
func NewWithClient(cfg *config.Config, cli dockerClient) *Adapter {
	return &Adapter{
		cfg:            cfg,
		client:         cli,
		collectStopped: cfg.Docker.CollectStopped,
		enableRollups:  cfg.Docker.EnableServiceRollups,
		enabledKeys:    enabledMetricKeys(cfg.DockerMetrics),
		prevCounters:   map[string]counterSnapshot{},
	}
}

func (a *Adapter) Name() string {
	return sourceName
}

func (a *Adapter) Collect() ([]domain.Metric, error) {
	if a.client == nil {
		return nil, fmt.Errorf("docker client is not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), a.cfg.Runtime.DockerTimeout)
	defer cancel()

	containers, err := a.client.ContainerList(ctx, containertypes.ListOptions{All: a.collectStopped})
	if err != nil {
		return nil, fmt.Errorf("list containers: %w", err)
	}

	metrics := make([]domain.Metric, 0, len(containers)*12)
	rollups := map[string]*serviceRollup{}
	seenContainers := map[string]struct{}{}

	for _, container := range containers {
		if container.ID == "" {
			continue
		}

		inspect, err := a.client.ContainerInspect(ctx, container.ID)
		if err != nil {
			continue
		}

		containerMetrics, rollup, ok := a.collectContainerMetrics(ctx, container, inspect)
		if !ok {
			continue
		}
		metrics = append(metrics, containerMetrics...)
		seenContainers[container.ID] = struct{}{}

		if rollup != nil {
			acc := rollups[rollupKey(container, inspect)]
			if acc == nil {
				acc = &serviceRollup{}
				rollups[rollupKey(container, inspect)] = acc
			}
			acc.containerCount += rollup.containerCount
			acc.runningContainerCount += rollup.runningContainerCount
			acc.cpuUsagePctSum += rollup.cpuUsagePctSum
			acc.memoryUsedBytesSum += rollup.memoryUsedBytesSum
		}
	}

	if a.enableRollups {
		metrics = append(metrics, a.buildServiceRollups(rollups)...)
	}

	a.pruneCounters(seenContainers)
	return metrics, nil
}

func (a *Adapter) collectContainerMetrics(ctx context.Context, summary types.Container, inspect types.ContainerJSON) ([]domain.Metric, *serviceRollup, bool) {
	scopeID := summary.ID
	containerName := resolveContainerName(summary, inspect)
	serviceName := resolveServiceName(summary, inspect)
	imageName, imageTag := splitImage(summary.Image)
	statusText := strings.TrimSpace(summary.Status)
	stateText := defaultString(resolveContainerState(inspect), defaultTextValue)
	healthStatus := defaultString(resolveHealthStatus(inspect), "none")
	labels := buildContainerLabels(a.cfg, summary, inspect, serviceName, imageName, imageTag)
	metrics := make([]domain.Metric, 0, 20)

	appendMetric := func(metric domain.Metric) {
		if metric.Name == "" {
			return
		}
		if _, ok := a.enabledKeys[metric.Name]; !ok {
			return
		}
		metric.ScopeType = "container"
		metric.ScopeID = scopeID
		metric.Source = sourceName
		if metric.Labels == nil {
			metric.Labels = map[string]string{}
		}
		for key, value := range labels {
			metric.Labels[key] = value
		}
		metrics = append(metrics, metric)
	}

	appendMetric(textMetric("container.name", containerName, "text", sourceInspectPrefix+".name"))
	appendMetric(textMetric("container.image", imageName, "text", sourceInspectPrefix+".image"))
	appendMetric(textMetric("container.image_tag", imageTag, "text", sourceInspectPrefix+".image_tag"))
	appendMetric(textMetric("container.runtime_id", scopeID, "text", sourceInspectPrefix+".id"))
	appendMetric(textMetric("container.status", defaultString(statusText, stateText), "text", sourceInspectPrefix+".status"))
	appendMetric(textMetric("container.state", stateText, "text", sourceInspectPrefix+".state"))
	appendMetric(textMetric("container.health_status", healthStatus, "state", sourceInspectPrefix+".health"))
	appendMetric(floatMetric("container.restart_count", float64(inspect.RestartCount), "count", sourceInspectPrefix+".restart_count"))
	appendMetric(textMetric("container.service_name", serviceName, "text", sourceInspectPrefix+".service_name"))
	appendMetric(textMetric("container.node_id", a.cfg.Runtime.NodeID, "text", sourceInspectPrefix+".node_id"))
	appendMetric(floatMetric("container.port_binding_count", float64(countPortBindings(inspect)), "count", sourceInspectPrefix+".ports"))
	appendMetric(floatMetric("container.mount_count", float64(len(inspect.Mounts)), "count", sourceInspectPrefix+".mounts"))
	appendMetric(floatMetric("container.network_count", float64(countNetworks(inspect)), "count", sourceInspectPrefix+".networks"))

	rollup := &serviceRollup{containerCount: 1}
	if inspect.ContainerJSONBase != nil && inspect.ContainerJSONBase.State != nil && inspect.ContainerJSONBase.State.Running {
		rollup.runningContainerCount = 1
		statsMetrics, cpu, memory := a.collectContainerStats(ctx, scopeID, labels)
		metrics = append(metrics, statsMetrics...)
		rollup.cpuUsagePctSum = cpu
		rollup.memoryUsedBytesSum = memory
	}

	return metrics, rollup, true
}

func (a *Adapter) collectContainerStats(ctx context.Context, containerID string, labels map[string]string) ([]domain.Metric, float64, float64) {
	statsReader, err := a.client.ContainerStats(ctx, containerID, false)
	if err != nil {
		return nil, 0, 0
	}
	defer statsReader.Body.Close()

	var stats containertypes.StatsResponse
	if err := json.NewDecoder(statsReader.Body).Decode(&stats); err != nil && err != io.EOF {
		return nil, 0, 0
	}

	now := resolveStatsTimestamp(stats)
	rxBytes, txBytes := sumNetworkBytes(stats)
	readBytes, writeBytes := sumBlockIOBytes(stats)
	memUsage := float64(stats.MemoryStats.Usage)
	memLimit := float64(stats.MemoryStats.Limit)
	memPct := 0.0
	if memLimit > 0 {
		memPct = memUsage / memLimit * 100
	}
	cpuPct := calculateCPUPercent(stats)
	pidCount := float64(stats.PidsStats.Current)

	networkRxRate, networkTxRate, blockReadRate, blockWriteRate := a.computeRates(containerID, now, rxBytes, txBytes, readBytes, writeBytes)

	metrics := make([]domain.Metric, 0, 8)
	appendMetric := func(metric domain.Metric) {
		if _, ok := a.enabledKeys[metric.Name]; !ok {
			return
		}
		metric.ScopeType = "container"
		metric.ScopeID = containerID
		metric.Source = sourceName
		if metric.Labels == nil {
			metric.Labels = map[string]string{}
		}
		for key, value := range labels {
			metric.Labels[key] = value
		}
		metrics = append(metrics, metric)
	}

	appendMetric(floatMetric("container.cpu_usage_pct", cpuPct, "%", sourceStatsPrefix+".cpu"))
	appendMetric(floatMetric("container.memory_used_bytes", memUsage, "bytes", sourceStatsPrefix+".memory_usage"))
	appendMetric(floatMetric("container.memory_used_pct", memPct, "%", sourceStatsPrefix+".memory_pct"))
	appendMetric(floatMetric("container.memory_limit_bytes", memLimit, "bytes", sourceStatsPrefix+".memory_limit"))
	appendMetric(floatMetric("container.network_rx_bytes_sec", networkRxRate, "bytes/sec", sourceStatsPrefix+".network_rx"))
	appendMetric(floatMetric("container.network_tx_bytes_sec", networkTxRate, "bytes/sec", sourceStatsPrefix+".network_tx"))
	appendMetric(floatMetric("container.block_read_bytes_sec", blockReadRate, "bytes/sec", sourceStatsPrefix+".block_read"))
	appendMetric(floatMetric("container.block_write_bytes_sec", blockWriteRate, "bytes/sec", sourceStatsPrefix+".block_write"))
	appendMetric(floatMetric("container.pid_count", pidCount, "count", sourceStatsPrefix+".pids"))

	return metrics, cpuPct, memUsage
}

func (a *Adapter) computeRates(containerID string, now time.Time, rxBytes, txBytes, readBytes, writeBytes uint64) (float64, float64, float64, float64) {
	a.mu.Lock()
	defer a.mu.Unlock()

	prev, ok := a.prevCounters[containerID]
	a.prevCounters[containerID] = counterSnapshot{
		at:         now,
		networkRx:  rxBytes,
		networkTx:  txBytes,
		blockRead:  readBytes,
		blockWrite: writeBytes,
	}
	if !ok || prev.at.IsZero() || !now.After(prev.at) {
		return 0, 0, 0, 0
	}

	seconds := now.Sub(prev.at).Seconds()
	if seconds <= 0 {
		return 0, 0, 0, 0
	}

	return float64(deltaUint64(rxBytes, prev.networkRx)) / seconds,
		float64(deltaUint64(txBytes, prev.networkTx)) / seconds,
		float64(deltaUint64(readBytes, prev.blockRead)) / seconds,
		float64(deltaUint64(writeBytes, prev.blockWrite)) / seconds
}

func (a *Adapter) pruneCounters(seenContainers map[string]struct{}) {
	a.mu.Lock()
	defer a.mu.Unlock()
	for containerID := range a.prevCounters {
		if _, ok := seenContainers[containerID]; !ok {
			delete(a.prevCounters, containerID)
		}
	}
}

func (a *Adapter) buildServiceRollups(rollups map[string]*serviceRollup) []domain.Metric {
	if len(rollups) == 0 {
		return nil
	}

	serviceNames := make([]string, 0, len(rollups))
	for name := range rollups {
		serviceNames = append(serviceNames, name)
	}
	sort.Strings(serviceNames)

	metrics := make([]domain.Metric, 0, len(serviceNames)*4)
	for _, serviceName := range serviceNames {
		rollup := rollups[serviceName]
		labels := map[string]string{
			"service_name": serviceName,
			"node_id":      a.cfg.Runtime.NodeID,
			"hostname":     a.cfg.Runtime.Hostname,
		}
		appendMetric := func(metric domain.Metric) {
			if _, ok := a.enabledKeys[metric.Name]; !ok {
				return
			}
			metric.ScopeType = "service"
			metric.ScopeID = serviceName
			metric.Source = sourceName
			metric.Labels = labels
			metrics = append(metrics, metric)
		}

		appendMetric(floatMetric("service.container_count", rollup.containerCount, "count", sourceInspectPrefix+".service_rollup"))
		appendMetric(floatMetric("service.running_container_count", rollup.runningContainerCount, "count", sourceInspectPrefix+".service_rollup"))
		appendMetric(floatMetric("service.cpu_usage_pct_sum", rollup.cpuUsagePctSum, "%", sourceStatsPrefix+".service_rollup"))
		appendMetric(floatMetric("service.memory_used_bytes_sum", rollup.memoryUsedBytesSum, "bytes", sourceStatsPrefix+".service_rollup"))
	}

	return metrics
}

func enabledMetricKeys(rules []config.MetricRule) map[string]struct{} {
	keys := make(map[string]struct{}, len(rules))
	for _, rule := range rules {
		if !rule.Enabled || strings.TrimSpace(rule.Key) == "" {
			continue
		}
		keys[rule.Key] = struct{}{}
	}
	return keys
}

func buildContainerLabels(cfg *config.Config, summary types.Container, inspect types.ContainerJSON, serviceName, imageName, imageTag string) map[string]string {
	labels := map[string]string{
		"container_id":   summary.ID,
		"container_name": resolveContainerName(summary, inspect),
		"image":          imageName,
		"image_tag":      imageTag,
		"service_name":   serviceName,
		"node_id":        cfg.Runtime.NodeID,
		"hostname":       cfg.Runtime.Hostname,
		"source_type":    sourceName,
	}
	if inspect.Config != nil {
		for key, value := range inspect.Config.Labels {
			if value == "" {
				continue
			}
			labels["docker_label."+sanitizeLabelKey(key)] = value
		}
	}
	if project := strings.TrimSpace(readDockerLabel(inspect, labelComposeProject)); project != "" {
		labels["compose_project"] = project
	}
	if inspect.NetworkSettings != nil && len(inspect.NetworkSettings.Networks) > 0 {
		networks := make([]string, 0, len(inspect.NetworkSettings.Networks))
		for networkName := range inspect.NetworkSettings.Networks {
			networks = append(networks, networkName)
		}
		sort.Strings(networks)
		labels["docker_networks"] = strings.Join(networks, ",")
	}
	return labels
}

func readDockerLabel(inspect types.ContainerJSON, key string) string {
	if inspect.Config == nil {
		return ""
	}
	return inspect.Config.Labels[key]
}

func resolveContainerState(inspect types.ContainerJSON) string {
	if inspect.ContainerJSONBase == nil || inspect.ContainerJSONBase.State == nil {
		return ""
	}
	return inspect.ContainerJSONBase.State.Status
}

func countNetworks(inspect types.ContainerJSON) int {
	if inspect.NetworkSettings == nil {
		return 0
	}
	return len(inspect.NetworkSettings.Networks)
}

func resolveContainerName(summary types.Container, inspect types.ContainerJSON) string {
	if name := resolveNamedContainerName(summary, inspect); name != "" {
		return name
	}
	return summary.ID
}

func resolveNamedContainerName(summary types.Container, inspect types.ContainerJSON) string {
	if inspect.ContainerJSONBase != nil && inspect.ContainerJSONBase.Name != "" {
		return strings.TrimPrefix(inspect.ContainerJSONBase.Name, "/")
	}
	for _, name := range summary.Names {
		if trimmed := strings.TrimPrefix(name, "/"); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func resolveServiceName(summary types.Container, inspect types.ContainerJSON) string {
	candidates := []string{
		readDockerLabel(inspect, labelComposeService),
		readDockerLabel(inspect, "service"),
		readDockerLabel(inspect, "app"),
		readDockerLabel(inspect, "app.kubernetes.io/name"),
	}
	for _, candidate := range candidates {
		if trimmed := strings.TrimSpace(candidate); trimmed != "" {
			return trimmed
		}
	}

	containerName := resolveNamedContainerName(summary, inspect)
	if normalized := normalizeContainerServiceName(containerName); normalized != "" {
		return normalized
	}

	imageName, _ := splitImage(summary.Image)
	if imageName != "" {
		parts := strings.Split(imageName, "/")
		return parts[len(parts)-1]
	}

	if containerName != "" {
		return containerName
	}
	return summary.ID
}

func normalizeContainerServiceName(name string) string {
	trimmed := strings.TrimSpace(strings.TrimPrefix(name, "/"))
	if trimmed == "" {
		return ""
	}
	for _, separator := range []string{"-", "_"} {
		if idx := strings.LastIndex(trimmed, separator); idx > 0 {
			suffix := trimmed[idx+1:]
			if isNumeric(suffix) {
				return trimmed[:idx]
			}
		}
	}
	return trimmed
}

func splitImage(image string) (string, string) {
	trimmed := strings.TrimSpace(image)
	if trimmed == "" {
		return defaultTextValue, "latest"
	}
	lastSlash := strings.LastIndex(trimmed, "/")
	lastColon := strings.LastIndex(trimmed, ":")
	if lastColon > lastSlash {
		return trimmed[:lastColon], trimmed[lastColon+1:]
	}
	return trimmed, "latest"
}

func resolveHealthStatus(inspect types.ContainerJSON) string {
	if inspect.ContainerJSONBase == nil || inspect.ContainerJSONBase.State == nil || inspect.ContainerJSONBase.State.Health == nil {
		return ""
	}
	return inspect.ContainerJSONBase.State.Health.Status
}

func countPortBindings(inspect types.ContainerJSON) int {
	if inspect.NetworkSettings == nil {
		return 0
	}
	count := 0
	for _, bindings := range inspect.NetworkSettings.Ports {
		if len(bindings) == 0 {
			continue
		}
		count += len(bindings)
	}
	return count
}

func resolveStatsTimestamp(stats containertypes.StatsResponse) time.Time {
	if stats.Read.IsZero() {
		return time.Now().UTC()
	}
	return stats.Read.UTC()
}

func sumNetworkBytes(stats containertypes.StatsResponse) (uint64, uint64) {
	var rx uint64
	var tx uint64
	for _, network := range stats.Networks {
		rx += network.RxBytes
		tx += network.TxBytes
	}
	return rx, tx
}

func sumBlockIOBytes(stats containertypes.StatsResponse) (uint64, uint64) {
	var readBytes uint64
	var writeBytes uint64
	for _, entry := range stats.BlkioStats.IoServiceBytesRecursive {
		switch strings.ToLower(entry.Op) {
		case "read":
			readBytes += entry.Value
		case "write":
			writeBytes += entry.Value
		}
	}
	return readBytes, writeBytes
}

func calculateCPUPercent(stats containertypes.StatsResponse) float64 {
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)
	if cpuDelta <= 0 || systemDelta <= 0 {
		return 0
	}

	onlineCPUs := float64(stats.CPUStats.OnlineCPUs)
	if onlineCPUs == 0 {
		onlineCPUs = float64(len(stats.CPUStats.CPUUsage.PercpuUsage))
	}
	if onlineCPUs == 0 {
		onlineCPUs = 1
	}

	return cpuDelta / systemDelta * onlineCPUs * 100
}

func textMetric(name, value, unit, sourceMetric string) domain.Metric {
	return domain.Metric{
		Name:         name,
		TextValue:    defaultString(value, defaultTextValue),
		Unit:         unit,
		SourceMetric: sourceMetric,
	}
}

func floatMetric(name string, value float64, unit, sourceMetric string) domain.Metric {
	return domain.Metric{
		Name:         name,
		Value:        value,
		Unit:         unit,
		SourceMetric: sourceMetric,
	}
}

func rollupKey(summary types.Container, inspect types.ContainerJSON) string {
	return resolveServiceName(summary, inspect)
}

func sanitizeLabelKey(value string) string {
	replacer := strings.NewReplacer("/", "_", ".", "_", "-", "_", ":", "_")
	return replacer.Replace(value)
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func deltaUint64(current, previous uint64) uint64 {
	if current < previous {
		return 0
	}
	return current - previous
}

func isNumeric(value string) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
