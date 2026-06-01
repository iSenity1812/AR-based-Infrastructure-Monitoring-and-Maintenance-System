package app

import (
	"path/filepath"

	"github.com/iSenity1812/go-agent-collector/internal/buffer"
	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/mapping"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
	"github.com/iSenity1812/go-agent-collector/internal/source"
)

// Run boots the agent runtime loops.
func Run() error {
	root, err := filepath.Abs(".")
	if err != nil {
		return err
	}
	cfg, err := config.Load(root)
	if err != nil {
		return err
	}
	src, err := source.New(cfg)
	if err != nil {
		return err
	}
	var bufferStore *buffer.Store
	if cfg.Buffer.Enabled {
		bufferStore = buffer.New(cfg.Buffer.Path, cfg.Buffer.MaxBatchFiles)
	}

	runner := newRunner(cfg, runtimeDeps{
		source: src,
		mapper: mapping.New(cfg),
		sender: sender.NewHTTPSender(cfg),
		buffer: bufferStore,
		queue:  newRecordQueue(cfg.Queue.MaxRecords, cfg.Queue.OverflowPolicy),
	})
	return runner.Run()
}
