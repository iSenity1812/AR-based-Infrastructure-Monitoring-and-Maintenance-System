package app

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

type runner struct {
	cfg     *config.Config
	deps    runtimeDeps
	counter *batchCounter
	retry   *retryState
	stats   *runtimeStats
	nowFn   func() time.Time
}

func newRunner(cfg *config.Config, deps runtimeDeps) *runner {
	return &runner{
		cfg:     cfg,
		deps:    deps,
		counter: newBatchCounter(),
		retry:   &retryState{},
		stats:   newRuntimeStats(time.Now().UTC()),
		nowFn:   time.Now,
	}
}

func (r *runner) now() time.Time {
	return r.nowFn().UTC()
}

func (r *runner) Run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if duration := os.Getenv("GO_AGENT_RUN_DURATION"); duration != "" {
		parsed, err := time.ParseDuration(duration)
		if err != nil {
			return fmt.Errorf("parse GO_AGENT_RUN_DURATION: %w", err)
		}
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, parsed)
		defer cancel()
	}

	fmt.Printf(
		"agent runtime started: agent=%s node=%s sources=%v scrape=%s send=%s endpoint=%s\n",
		r.cfg.Runtime.AgentID,
		r.cfg.Runtime.NodeID,
		r.cfg.Runtime.EnabledSources,
		r.cfg.Scrape.Interval,
		r.cfg.Send.Interval,
		r.cfg.Send.Endpoint,
	)
	r.startObservability(ctx)

	r.scrapeOnce(ctx)

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		r.runScrapeLoop(ctx)
	}()
	go func() {
		defer wg.Done()
		r.runSendLoop(ctx)
	}()

	<-ctx.Done()
	r.flushOnce()
	wg.Wait()
	fmt.Println("agent runtime stopped")
	return nil
}

func (r *runner) runScrapeLoop(ctx context.Context) {
	ticker := time.NewTicker(r.cfg.Runtime.ScrapeInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.scrapeOnce(ctx)
		}
	}
}

func (r *runner) runSendLoop(ctx context.Context) {
	ticker := time.NewTicker(r.cfg.Runtime.SendInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.sendOnce(ctx)
		}
	}
}

func (r *runner) scrapeOnce(ctx context.Context) {
	collectedAt := r.now()
	collected := make([]domain.Metric, 0)
	for _, src := range r.deps.sources {
		metrics, err := src.Collect()
		if err != nil {
			r.stats.recordScrapeFailure(src.Name(), err)
			fmt.Printf("scrape failed: source=%s err=%v\n", src.Name(), err)
			continue
		}
		r.stats.recordScrapeSuccess(src.Name(), collectedAt)
		collected = append(collected, metrics...)
	}
	if len(collected) == 0 {
		_ = ctx
		return
	}

	records := buildQueueRecords(collected, collectedAt)
	r.deps.queue.Enqueue(records)
	fmt.Printf(
		"scrape ok: metrics=%d queued=%d at=%s\n",
		len(collected),
		r.deps.queue.Len(),
		collectedAt.Format(time.RFC3339),
	)
	_ = ctx
}

func (r *runner) flushOnce() {
	ctx, cancel := context.WithTimeout(context.Background(), r.cfg.Runtime.SendTimeout)
	defer cancel()
	r.sendOnce(ctx)
}

func (r *runner) bufferedCount() int {
	if r.deps.buffer == nil {
		return 0
	}
	count, err := r.deps.buffer.Count()
	if err != nil {
		return 0
	}
	return count
}

func buildQueueRecords(metrics []domain.Metric, collectedAt time.Time) []queueRecord {
	records := make([]queueRecord, 0, len(metrics))
	for _, metric := range metrics {
		records = append(records, queueRecord{
			metric:      metric,
			collectedAt: collectedAt,
		})
	}
	return records
}
