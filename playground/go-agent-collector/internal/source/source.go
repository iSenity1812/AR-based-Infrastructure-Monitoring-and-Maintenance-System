package source

import (
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

// Source represents a metric source adapter.
type Source interface {
	Name() string
	Collect() ([]domain.Metric, error)
}

// ContextProvider allows a source to enrich the shared payload context.
type ContextProvider interface {
	SharedContext() sender.PayloadContext
}
