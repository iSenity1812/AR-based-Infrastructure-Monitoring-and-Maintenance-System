package mapping

import (
	"strings"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

type counterPoint struct {
	value float64
	at    time.Time
}

// Engine maps raw exporter samples into normalized node metrics.
type Engine struct {
	cfg   *config.Config
	prev  map[string]counterPoint
	clock func() time.Time
}

// New creates a config-driven mapping engine.
func New(cfg *config.Config) *Engine {
	return &Engine{
		cfg:   cfg,
		prev:  make(map[string]counterPoint),
		clock: time.Now,
	}
}

// Map normalizes one raw scrape snapshot using YAML mapping rules.
func (e *Engine) Map(raw []domain.Metric) ([]domain.Metric, error) {
	now := e.clock()
	index := buildIndex(raw)
	primaryNIC := e.selectPrimaryNIC(index)
	systemDrive := e.selectSystemDrive(index)

	out := make([]domain.Metric, 0, len(e.cfg.Metrics))
	for _, rule := range e.cfg.Metrics {
		if !rule.Enabled {
			continue
		}
		out = append(out, e.applyRule(rule, index, primaryNIC, systemDrive, now)...)
	}

	e.remember(raw, now)
	return out, nil
}

func (e *Engine) applyRule(rule config.MetricRule, index map[string][]domain.Metric, primaryNIC, systemDrive string, now time.Time) []domain.Metric {
	switch {
	case rule.Aggregation == "direct":
		return e.mapDirect(rule, index)
	case rule.Aggregation == "bytes_to_mb":
		return e.mapScaledFirst(rule, index, 1024*1024)
	case rule.Aggregation == "derive_used_pct":
		return e.mapUsedPct(rule, index)
	case rule.Aggregation == "derive_ratio_pct":
		return e.mapRatioPct(rule, index)
	case rule.Aggregation == "derive_uptime":
		return e.mapUptime(rule, index, now)
	case strings.HasPrefix(rule.Aggregation, "label_value:"):
		return e.mapLabelValue(rule, index, strings.TrimPrefix(rule.Aggregation, "label_value:"))
	case rule.Aggregation == "primary_nic_ipv4":
		return e.mapPrimaryNICIPv4(rule, index, primaryNIC)
	case strings.HasPrefix(rule.Aggregation, "avg_by:"):
		return e.mapAverage(rule, index)
	case rule.Aggregation == "system_drive_bytes_to_gb":
		return e.mapSystemDriveBytesToGB(rule, index, systemDrive)
	case rule.Aggregation == "system_drive_used_pct":
		return e.mapSystemDriveUsedPct(rule, index, systemDrive)
	case rule.Aggregation == "system_drive_direct":
		return e.mapSystemDriveDirect(rule, index, systemDrive)
	case rule.Aggregation == "primary_nic_status":
		return e.mapPrimaryNICStatus(rule, index, primaryNIC)
	case rule.Aggregation == "derive_network_utilization_pct":
		return e.mapNetworkUtilization(rule, index, primaryNIC, now)
	case rule.Aggregation == "rate":
		return e.mapRate(rule, index, now)
	case strings.HasPrefix(rule.Aggregation, "sum_rate_by:"):
		return e.mapSummedRateBy(rule, index, strings.TrimPrefix(rule.Aggregation, "sum_rate_by:"), now)
	case rule.Aggregation == "system_drive_rate":
		return e.mapSystemDriveRate(rule, index, systemDrive, now)
	case rule.Aggregation == "select_primary_nic_rate":
		return e.mapPrimaryNICRate(rule, index, primaryNIC, now)
	case rule.Aggregation == "cpu_usage_from_idle":
		return e.mapCPUUsage(rule, index, now)
	default:
		return nil
	}
}
