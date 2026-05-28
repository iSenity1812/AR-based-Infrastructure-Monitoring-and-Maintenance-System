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
		"agent runtime started: agent=%s node=%s scrape=%s send=%s endpoint=%s\n",
		r.cfg.Runtime.AgentID,
		r.cfg.Runtime.NodeID,
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
	raw, err := r.deps.source.Collect()
	if err != nil {
		r.stats.recordScrapeFailure(err)
		fmt.Printf("scrape failed: %v\n", err)
		return
	}
	normalized, err := r.deps.mapper.Map(raw)
	if err != nil {
		r.stats.recordScrapeFailure(err)
		fmt.Printf("mapping failed: %v\n", err)
		return
	}
	records := buildQueueRecords(normalized, collectedAt)
	r.deps.queue.Enqueue(records)
	r.stats.recordScrapeSuccess(collectedAt)
	fmt.Printf(
		"scrape ok: raw=%d normalized=%d queued=%d at=%s\n",
		len(raw),
		len(normalized),
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
