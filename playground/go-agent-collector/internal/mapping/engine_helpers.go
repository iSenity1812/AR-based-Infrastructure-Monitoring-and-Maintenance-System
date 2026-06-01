package mapping

import (
	"math"
	"sort"
	"strings"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

func buildIndex(raw []domain.Metric) map[string][]domain.Metric {
	index := make(map[string][]domain.Metric)
	for _, metric := range raw {
		index[metric.Name] = append(index[metric.Name], metric)
	}
	return index
}

func buildNumericMetric(rule config.MetricRule, value float64, labels map[string]string) domain.Metric {
	if len(labels) == 0 {
		labels = nil
	}
	return domain.Metric{
		Name:         rule.Key,
		Value:        round(value),
		Unit:         rule.Unit,
		Labels:       labels,
		SourceMetric: strings.Join(metricNames(rule), ","),
		ScopeType:    rule.ScopeType,
	}
}

func pickLabels(labels map[string]string, keep []string) map[string]string {
	if len(keep) == 0 || len(labels) == 0 {
		return nil
	}
	out := make(map[string]string)
	for _, key := range keep {
		if value, ok := labels[key]; ok {
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func metricNames(rule config.MetricRule) []string {
	return append([]string(nil), []string(rule.SourceMetric)...)
}

func firstMetricName(rule config.MetricRule) string {
	names := metricNames(rule)
	if len(names) == 0 {
		return ""
	}
	return names[0]
}

func firstValue(samples []domain.Metric) float64 {
	if len(samples) == 0 {
		return 0
	}
	return samples[0].Value
}

func sumValues(samples []domain.Metric) float64 {
	var sum float64
	for _, sample := range samples {
		sum += sample.Value
	}
	return sum
}

func average(samples []domain.Metric) float64 {
	if len(samples) == 0 {
		return 0
	}
	return sumValues(samples) / float64(len(samples))
}

func groupByLabels(samples []domain.Metric, keep []string) map[string][]domain.Metric {
	grouped := make(map[string][]domain.Metric)
	for _, sample := range samples {
		key := labelGroupKey(sample.Labels, keep)
		grouped[key] = append(grouped[key], sample)
	}
	return grouped
}

func labelGroupKey(labels map[string]string, keep []string) string {
	if len(keep) == 0 {
		return ""
	}
	parts := make([]string, 0, len(keep))
	for _, key := range keep {
		parts = append(parts, key+"="+labels[key])
	}
	return strings.Join(parts, "|")
}

func labelsForGroup(primary, fallback []domain.Metric, keep []string) map[string]string {
	if len(primary) > 0 {
		return pickLabels(primary[0].Labels, keep)
	}
	if len(fallback) > 0 {
		return pickLabels(fallback[0].Labels, keep)
	}
	return nil
}

func unionKeys(left, right map[string][]domain.Metric) []string {
	seen := make(map[string]struct{})
	for key := range left {
		seen[key] = struct{}{}
	}
	for key := range right {
		seen[key] = struct{}{}
	}
	return sortedKeys(seen)
}

func sortedKeys[T any](m map[string]T) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func selectVolumeSample(samples []domain.Metric, volume string) (domain.Metric, bool) {
	for _, sample := range samples {
		if sample.Labels["volume"] == volume {
			return sample, true
		}
	}
	return domain.Metric{}, false
}

func selectNICSample(samples []domain.Metric, nic string) (domain.Metric, bool) {
	for _, sample := range samples {
		if sample.Labels["nic"] == nic {
			return sample, true
		}
	}
	return domain.Metric{}, false
}

func shouldExcludeNIC(name string, patterns []string) bool {
	lower := strings.ToLower(name)
	for _, pattern := range patterns {
		if strings.Contains(lower, strings.ToLower(pattern)) {
			return true
		}
	}
	return false
}

func seriesKey(metric domain.Metric) string {
	parts := make([]string, 0, len(metric.Labels))
	for key, value := range metric.Labels {
		parts = append(parts, key+"="+value)
	}
	sort.Strings(parts)
	return metric.Name + "|" + strings.Join(parts, ",")
}

func round(value float64) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0
	}
	return math.Round(value*1000) / 1000
}
