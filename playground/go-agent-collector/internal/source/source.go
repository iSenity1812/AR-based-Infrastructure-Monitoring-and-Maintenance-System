package source

import "github.com/iSenity1812/go-agent-collector/internal/domain"

// Source represents a metric source adapter.
type Source interface {
	Collect() ([]domain.Metric, error)
}
