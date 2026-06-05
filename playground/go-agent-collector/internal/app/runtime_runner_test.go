package app

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/source"
)

type fakeSource struct {
	name    string
	metrics []domain.Metric
	err     error
}

func (f fakeSource) Name() string { return f.name }

func (f fakeSource) Collect() ([]domain.Metric, error) {
	if f.err != nil {
		return nil, f.err
	}
	return append([]domain.Metric(nil), f.metrics...), nil
}

func TestScrapeOnceMergesMultipleSourcesAndKeepsHealthySource(t *testing.T) {
	cfg := &config.Config{}
	cfg.Runtime.NodeID = "node-1"
	cfg.Runtime.ScrapeInterval = 5 * time.Second

	r := newRunner(cfg, runtimeDeps{
		sources: []source.Source{
			fakeSource{
				name: "windows_exporter",
				metrics: []domain.Metric{{
					Name:         "node.process_count",
					Value:        3,
					Unit:         "count",
					ScopeType:    "node",
					ScopeID:      "node-1",
					Source:       "windows_exporter",
					SourceMetric: "windows_system_processes",
				}},
			},
			fakeSource{
				name: "docker",
				metrics: []domain.Metric{{
					Name:         "container.cpu_usage_pct",
					Value:        15,
					Unit:         "%",
					ScopeType:    "container",
					ScopeID:      "abc123",
					Source:       "docker",
					SourceMetric: "docker.stats.cpu",
				}},
			},
			fakeSource{
				name: "broken",
				err:  errors.New("boom"),
			},
		},
		queue: newRecordQueue(10, "drop_oldest"),
	})
	now := time.Date(2026, 6, 4, 10, 0, 0, 0, time.UTC)
	r.nowFn = func() time.Time { return now }

	r.scrapeOnce(context.Background())

	if got := r.deps.queue.Len(); got != 2 {
		t.Fatalf("expected 2 metrics from healthy sources, got %d", got)
	}

	snapshot := r.stats.snapshot(r.deps.queue.Len(), 0, 0, time.Time{}, cfg.Runtime.ScrapeInterval)
	if snapshot.Sources["windows_exporter"].ScrapeSuccessCount != 1 {
		t.Fatalf("expected windows_exporter success count 1, got %#v", snapshot.Sources)
	}
	if snapshot.Sources["docker"].ScrapeSuccessCount != 1 {
		t.Fatalf("expected docker success count 1, got %#v", snapshot.Sources)
	}
	if snapshot.Sources["broken"].ScrapeFailureCount != 1 {
		t.Fatalf("expected broken source failure count 1, got %#v", snapshot.Sources)
	}
}
