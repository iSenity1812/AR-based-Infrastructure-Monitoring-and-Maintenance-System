package source

import (
	"fmt"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/mapping"
	"github.com/iSenity1812/go-agent-collector/internal/source/docker"
	"github.com/iSenity1812/go-agent-collector/internal/source/windows"
)

// NewAll constructs all enabled source collectors from runtime config.
func NewAll(cfg *config.Config) ([]Source, error) {
	sources := make([]Source, 0, len(cfg.Runtime.EnabledSources))
	for _, sourceType := range cfg.Runtime.EnabledSources {
		switch sourceType {
		case "windows_exporter":
			sources = append(sources, windows.NewCollector(cfg, mapping.New(cfg)))
		case "docker":
			sources = append(sources, docker.New(cfg))
		case "node_exporter":
			return nil, fmt.Errorf("source type %q is documented but not implemented yet", sourceType)
		default:
			return nil, fmt.Errorf("unsupported source type %q", sourceType)
		}
	}
	return sources, nil
}
