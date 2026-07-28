package app

import (
	"os"
	"path/filepath"

	"github.com/iSenity1812/go-agent-collector/internal/buffer"
	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/runtimebundle"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
	"github.com/iSenity1812/go-agent-collector/internal/source"
)

// Run boots the agent runtime loops.
func Run() error {
	root, err := resolveBaseDir()
	if err != nil {
		return err
	}
	if err := runtimebundle.EnsureMaterialized(root); err != nil {
		return err
	}
	cfg, err := config.Load(root)
	if err != nil {
		return err
	}
	if err := ensureRegistered(cfg); err != nil {
		return err
	}
	sources, err := source.NewAll(cfg)
	if err != nil {
		return err
	}
	var bufferStore *buffer.Store
	if cfg.Buffer.Enabled {
		bufferStore = buffer.New(cfg.Buffer.Path, cfg.Buffer.MaxBatchFiles)
	}

	selectedSender, err := sender.New(cfg)
	if err != nil {
		return err
	}

	runner := newRunner(cfg, runtimeDeps{
		sources: sources,
		sender:  selectedSender,
		buffer:  bufferStore,
		queue:   newRecordQueue(cfg.Queue.MaxRecords, cfg.Queue.OverflowPolicy),
	})
	return runner.Run()
}

func resolveBaseDir() (string, error) {
	if override := os.Getenv("GO_AGENT_BASE_DIR"); override != "" {
		return filepath.Abs(override)
	}

	if cwd, err := os.Getwd(); err == nil {
		if _, statErr := os.Stat(filepath.Join(cwd, "configs", "agent.yaml")); statErr == nil {
			return filepath.Abs(cwd)
		}
	}

	executablePath, err := os.Executable()
	if err != nil {
		return "", err
	}

	resolvedPath, err := filepath.EvalSymlinks(executablePath)
	if err == nil {
		executablePath = resolvedPath
	}

	return filepath.Dir(executablePath), nil
}
