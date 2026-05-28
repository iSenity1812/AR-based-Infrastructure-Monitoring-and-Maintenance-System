package source

import (
	"fmt"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/source/windows"
)

// New constructs a source adapter from runtime config.
func New(cfg *config.Config) (Source, error) {
	switch cfg.Agent.SourceType {
	case "windows_exporter":
		return windows.New(cfg), nil
	case "node_exporter":
		return nil, fmt.Errorf("source type %q is documented but not implemented yet", cfg.Agent.SourceType)
	default:
		return nil, fmt.Errorf("unsupported source type %q", cfg.Agent.SourceType)
	}
}
