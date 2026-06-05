package windows

import (
	"fmt"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

type metricMapper interface {
	Map(raw []domain.Metric) ([]domain.Metric, error)
}

// Collector wraps the raw Windows adapter with the node metric mapping engine.
type Collector struct {
	cfg     *config.Config
	adapter *Adapter
	mapper  metricMapper
}

// NewCollector returns a normalized Windows metric collector.
func NewCollector(cfg *config.Config, mapper metricMapper) *Collector {
	return &Collector{
		cfg:     cfg,
		adapter: New(cfg),
		mapper:  mapper,
	}
}

func (c *Collector) Name() string {
	return "windows_exporter"
}

func (c *Collector) Collect() ([]domain.Metric, error) {
	raw, err := c.adapter.Collect()
	if err != nil {
		return nil, err
	}

	normalized, err := c.mapper.Map(raw)
	if err != nil {
		return nil, fmt.Errorf("map windows metrics: %w", err)
	}

	for i := range normalized {
		normalized[i].Source = c.Name()
		if normalized[i].ScopeType == "" {
			normalized[i].ScopeType = "node"
		}
		if normalized[i].ScopeID == "" && normalized[i].ScopeType == "node" {
			normalized[i].ScopeID = c.cfg.Runtime.NodeID
		}
	}

	return normalized, nil
}
