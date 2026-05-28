package mapping

import (
	"os"
	"strings"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

func (e *Engine) mapRate(rule config.MetricRule, index map[string][]domain.Metric, now time.Time) []domain.Metric {
	samples := index[firstMetricName(rule)]
	if len(samples) == 0 {
		return nil
	}
	var total float64
	var labels map[string]string
	for _, sample := range samples {
		rate, ok := e.sampleRate(sample, now)
		if !ok {
			continue
		}
		total += rate
		if labels == nil {
			labels = pickLabels(sample.Labels, rule.KeepLabels)
		}
	}
	if total == 0 && labels == nil {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, total, labels)}
}

func (e *Engine) mapSummedRateBy(rule config.MetricRule, index map[string][]domain.Metric, labelKey string, now time.Time) []domain.Metric {
	samples := index[firstMetricName(rule)]
	if len(samples) == 0 {
		return nil
	}
	sums := make(map[string]float64)
	labelsByGroup := make(map[string]map[string]string)
	for _, sample := range samples {
		rate, ok := e.sampleRate(sample, now)
		if !ok {
			continue
		}
		group := sample.Labels[labelKey]
		sums[group] += rate
		if _, exists := labelsByGroup[group]; !exists {
			labelsByGroup[group] = pickLabels(sample.Labels, rule.KeepLabels)
		}
	}
	var out []domain.Metric
	for _, key := range sortedKeys(sums) {
		out = append(out, buildNumericMetric(rule, sums[key], labelsByGroup[key]))
	}
	return out
}

func (e *Engine) mapSystemDriveRate(rule config.MetricRule, index map[string][]domain.Metric, systemDrive string, now time.Time) []domain.Metric {
	sample, ok := selectVolumeSample(index[firstMetricName(rule)], systemDrive)
	if !ok {
		return nil
	}
	rate, ok := e.sampleRate(sample, now)
	if !ok {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, rate, pickLabels(sample.Labels, rule.KeepLabels))}
}

func (e *Engine) mapPrimaryNICRate(rule config.MetricRule, index map[string][]domain.Metric, primaryNIC string, now time.Time) []domain.Metric {
	sample, ok := selectNICSample(index[firstMetricName(rule)], primaryNIC)
	if !ok {
		return nil
	}
	rate, ok := e.sampleRate(sample, now)
	if !ok {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, rate, pickLabels(sample.Labels, rule.KeepLabels))}
}

func (e *Engine) mapCPUUsage(rule config.MetricRule, index map[string][]domain.Metric, now time.Time) []domain.Metric {
	samples := index[firstMetricName(rule)]
	if len(samples) == 0 {
		return nil
	}

	type coreDelta struct {
		total float64
		idle  float64
	}
	perCore := make(map[string]*coreDelta)

	for _, sample := range samples {
		core := sample.Labels["core"]
		if core == "" || core == "_Total" {
			continue
		}
		rate, ok := e.sampleRate(sample, now)
		if !ok {
			continue
		}
		if perCore[core] == nil {
			perCore[core] = &coreDelta{}
		}
		perCore[core].total += rate
		if strings.EqualFold(sample.Labels["mode"], "idle") {
			perCore[core].idle += rate
		}
	}

	var usageSum float64
	var count float64
	for _, delta := range perCore {
		if delta.total <= 0 {
			continue
		}
		usageSum += (1 - (delta.idle / delta.total)) * 100
		count++
	}
	if count == 0 {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, usageSum/count, nil)}
}

func (e *Engine) sampleRate(sample domain.Metric, now time.Time) (float64, bool) {
	prev, ok := e.prev[seriesKey(sample)]
	if !ok {
		return 0, false
	}
	deltaT := now.Sub(prev.at).Seconds()
	deltaV := sample.Value - prev.value
	if deltaT <= 0 || deltaV < 0 {
		return 0, false
	}
	return deltaV / deltaT, true
}

func (e *Engine) remember(raw []domain.Metric, now time.Time) {
	for _, metric := range raw {
		e.prev[seriesKey(metric)] = counterPoint{value: metric.Value, at: now}
	}
}

func (e *Engine) selectPrimaryNIC(index map[string][]domain.Metric) string {
	if hint := strings.TrimSpace(e.cfg.Runtime.PrimaryNICHint); hint != "" {
		return hint
	}

	candidates := append([]domain.Metric{}, index["windows_net_nic_address_info"]...)
	candidates = append(candidates, index["windows_net_nic_operation_status"]...)
	candidates = append(candidates, index["windows_net_bytes_received_total"]...)

	for _, sample := range candidates {
		nic := strings.TrimSpace(sample.Labels["nic"])
		if nic == "" || shouldExcludeNIC(nic, e.cfg.Network.ExcludeNICPatterns) {
			continue
		}
		if family := sample.Labels["family"]; family != "" && !strings.EqualFold(family, "ipv4") {
			continue
		}
		return nic
	}
	return ""
}

func (e *Engine) selectSystemDrive(index map[string][]domain.Metric) string {
	preferred := strings.TrimSpace(os.Getenv("SystemDrive"))
	if preferred == "" {
		preferred = "C:"
	}

	for _, sample := range index["windows_logical_disk_free_bytes"] {
		if sample.Labels["volume"] == preferred {
			return preferred
		}
	}
	for _, sample := range index["windows_logical_disk_free_bytes"] {
		volume := sample.Labels["volume"]
		if volume == "" || strings.EqualFold(volume, "_Total") {
			continue
		}
		return volume
	}
	return preferred
}
