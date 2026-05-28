package mapping

import (
	"strings"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

func (e *Engine) mapDirect(rule config.MetricRule, index map[string][]domain.Metric) []domain.Metric {
	samples := index[firstMetricName(rule)]
	if len(samples) == 0 {
		return nil
	}
	sample := samples[0]
	return []domain.Metric{buildNumericMetric(rule, sample.Value, pickLabels(sample.Labels, rule.KeepLabels))}
}

func (e *Engine) mapScaledFirst(rule config.MetricRule, index map[string][]domain.Metric, scale float64) []domain.Metric {
	samples := index[firstMetricName(rule)]
	if len(samples) == 0 {
		return nil
	}
	sample := samples[0]
	return []domain.Metric{buildNumericMetric(rule, sample.Value/scale, pickLabels(sample.Labels, rule.KeepLabels))}
}

func (e *Engine) mapUsedPct(rule config.MetricRule, index map[string][]domain.Metric) []domain.Metric {
	names := metricNames(rule)
	if len(names) != 2 {
		return nil
	}
	available := firstValue(index[names[0]])
	total := firstValue(index[names[1]])
	if total <= 0 {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, ((total-available)/total)*100, nil)}
}

func (e *Engine) mapRatioPct(rule config.MetricRule, index map[string][]domain.Metric) []domain.Metric {
	names := metricNames(rule)
	if len(names) != 2 {
		return nil
	}

	if len(rule.KeepLabels) == 0 {
		numerator := sumValues(index[names[0]])
		denominator := sumValues(index[names[1]])
		if denominator <= 0 {
			return nil
		}
		return []domain.Metric{buildNumericMetric(rule, (numerator/denominator)*100, nil)}
	}

	groupedNumerator := groupByLabels(index[names[0]], rule.KeepLabels)
	groupedDenominator := groupByLabels(index[names[1]], rule.KeepLabels)
	keys := unionKeys(groupedNumerator, groupedDenominator)

	var out []domain.Metric
	for _, key := range keys {
		numerator := sumValues(groupedNumerator[key])
		denominator := sumValues(groupedDenominator[key])
		if denominator <= 0 {
			continue
		}
		labels := labelsForGroup(groupedNumerator[key], groupedDenominator[key], rule.KeepLabels)
		out = append(out, buildNumericMetric(rule, (numerator/denominator)*100, labels))
	}
	return out
}

func (e *Engine) mapUptime(rule config.MetricRule, index map[string][]domain.Metric, now time.Time) []domain.Metric {
	samples := index[firstMetricName(rule)]
	if len(samples) == 0 {
		return nil
	}
	boot := samples[0].Value
	if boot <= 0 {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, now.Sub(time.Unix(int64(boot), 0)).Seconds(), nil)}
}

func (e *Engine) mapLabelValue(rule config.MetricRule, index map[string][]domain.Metric, labelKey string) []domain.Metric {
	samples := index[firstMetricName(rule)]
	if len(samples) == 0 {
		return nil
	}
	sample := samples[0]
	text := sample.Labels[labelKey]
	if text == "" {
		return nil
	}
	metric := buildNumericMetric(rule, sample.Value, pickLabels(sample.Labels, rule.KeepLabels))
	metric.TextValue = text
	return []domain.Metric{metric}
}

func (e *Engine) mapPrimaryNICIPv4(rule config.MetricRule, index map[string][]domain.Metric, primaryNIC string) []domain.Metric {
	for _, sample := range index[firstMetricName(rule)] {
		if sample.Labels["nic"] != primaryNIC || !strings.EqualFold(sample.Labels["family"], "ipv4") {
			continue
		}
		text := sample.Labels["address"]
		if text == "" {
			continue
		}
		metric := buildNumericMetric(rule, sample.Value, pickLabels(sample.Labels, rule.KeepLabels))
		metric.TextValue = text
		return []domain.Metric{metric}
	}
	return nil
}

func (e *Engine) mapAverage(rule config.MetricRule, index map[string][]domain.Metric) []domain.Metric {
	samples := index[firstMetricName(rule)]
	if len(samples) == 0 {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, average(samples), nil)}
}

func (e *Engine) mapSystemDriveBytesToGB(rule config.MetricRule, index map[string][]domain.Metric, systemDrive string) []domain.Metric {
	sample, ok := selectVolumeSample(index[firstMetricName(rule)], systemDrive)
	if !ok {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, sample.Value/(1024*1024*1024), pickLabels(sample.Labels, rule.KeepLabels))}
}

func (e *Engine) mapSystemDriveUsedPct(rule config.MetricRule, index map[string][]domain.Metric, systemDrive string) []domain.Metric {
	names := metricNames(rule)
	if len(names) != 2 {
		return nil
	}
	free, ok := selectVolumeSample(index[names[0]], systemDrive)
	if !ok {
		return nil
	}
	size, ok := selectVolumeSample(index[names[1]], systemDrive)
	if !ok || size.Value <= 0 {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, ((size.Value-free.Value)/size.Value)*100, pickLabels(free.Labels, rule.KeepLabels))}
}

func (e *Engine) mapSystemDriveDirect(rule config.MetricRule, index map[string][]domain.Metric, systemDrive string) []domain.Metric {
	sample, ok := selectVolumeSample(index[firstMetricName(rule)], systemDrive)
	if !ok {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, sample.Value, pickLabels(sample.Labels, rule.KeepLabels))}
}

func (e *Engine) mapPrimaryNICStatus(rule config.MetricRule, index map[string][]domain.Metric, primaryNIC string) []domain.Metric {
	for _, sample := range index[firstMetricName(rule)] {
		if sample.Labels["nic"] != primaryNIC {
			continue
		}
		metric := buildNumericMetric(rule, sample.Value, pickLabels(sample.Labels, rule.KeepLabels))
		if status := sample.Labels["status"]; status != "" {
			metric.TextValue = status
		}
		return []domain.Metric{metric}
	}
	return nil
}

func (e *Engine) mapNetworkUtilization(rule config.MetricRule, index map[string][]domain.Metric, primaryNIC string, now time.Time) []domain.Metric {
	names := metricNames(rule)
	if len(names) != 2 {
		return nil
	}
	traffic, ok := selectNICSample(index[names[0]], primaryNIC)
	if !ok {
		return nil
	}
	bandwidth, ok := selectNICSample(index[names[1]], primaryNIC)
	if !ok || bandwidth.Value <= 0 {
		return nil
	}
	rate, ok := e.sampleRate(traffic, now)
	if !ok {
		return nil
	}
	return []domain.Metric{buildNumericMetric(rule, (rate/bandwidth.Value)*100, pickLabels(bandwidth.Labels, rule.KeepLabels))}
}
