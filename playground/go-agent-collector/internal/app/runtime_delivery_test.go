package app

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/buffer"
	"github.com/iSenity1812/go-agent-collector/internal/config"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

type fakeSender struct {
	err   error
	sends []sender.Payload
}

func (f *fakeSender) Send(_ context.Context, payload sender.Payload) error {
	f.sends = append(f.sends, payload)
	return f.err
}

func TestSendPayloadSchedulesRetryAndBuffersOnFailure(t *testing.T) {
	cfg := testConfig()
	sendErr := sender.StatusError{Code: 503}
	fSender := &fakeSender{err: sendErr}
	fBuffer := &memoryBuffer{}
	r := newRunner(cfg, runtimeDeps{
		sender: fSender,
		buffer: fBuffer,
		queue:  newRecordQueue(10, "drop_oldest"),
	})
	now := time.Date(2026, 5, 28, 4, 0, 0, 0, time.UTC)
	r.nowFn = func() time.Time { return now }

	payload := buildPayload(cfg, []queueRecord{{metric: domain.Metric{Name: "node.process_count", Value: 3, Unit: "count"}, collectedAt: now}}, 0, r.counter, now)
	result, err := r.sendPayload(context.Background(), payload, true)
	if !errors.Is(err, sendErr) {
		t.Fatalf("expected send error to be returned, got %v", err)
	}
	if !result.persisted || !result.retryable {
		t.Fatalf("expected retryable persisted result, got %#v", result)
	}
	if len(fBuffer.items) != 1 {
		t.Fatalf("expected payload to be buffered, got %d items", len(fBuffer.items))
	}
	if !r.retry.nextAttemptAt.After(now) {
		t.Fatalf("expected retry to be scheduled in the future")
	}
}

func TestReplayBufferedRunsBeforeQueue(t *testing.T) {
	cfg := testConfig()
	fSender := &fakeSender{}
	fBuffer := &memoryBuffer{
		items: []sender.Payload{{Batch: sender.BatchMeta{BatchID: "buffered-1"}}},
	}
	r := newRunner(cfg, runtimeDeps{
		sender: fSender,
		buffer: fBuffer,
		queue:  newRecordQueue(10, "drop_oldest"),
	})
	now := time.Date(2026, 5, 28, 4, 0, 0, 0, time.UTC)
	r.nowFn = func() time.Time { return now }
	r.deps.queue.Enqueue([]queueRecord{{metric: domain.Metric{Name: "node.process_count", Value: 3}}})

	r.sendOnce(context.Background())
	if len(fSender.sends) != 1 || fSender.sends[0].Batch.BatchID != "buffered-1" {
		t.Fatalf("expected buffered payload to be sent first, got %#v", fSender.sends)
	}
	if r.deps.queue.Len() != 1 {
		t.Fatalf("expected queue data to remain until buffered replay finishes, got len=%d", r.deps.queue.Len())
	}
}

func TestReplayBufferedDropsNonRetryableBatch(t *testing.T) {
	cfg := testConfig()
	fSender := &fakeSender{err: sender.StatusError{Code: 400}}
	fBuffer := &memoryBuffer{
		items: []sender.Payload{{Batch: sender.BatchMeta{BatchID: "bad-buffered-1"}}},
	}
	r := newRunner(cfg, runtimeDeps{
		sender: fSender,
		buffer: fBuffer,
		queue:  newRecordQueue(10, "drop_oldest"),
	})
	r.nowFn = func() time.Time { return time.Date(2026, 5, 28, 4, 0, 0, 0, time.UTC) }

	replayed, err := r.replayBuffered(context.Background(), r.now())
	if err == nil || !replayed {
		t.Fatalf("expected non-retryable replay error and replayed=true, got replayed=%v err=%v", replayed, err)
	}
	if len(fBuffer.items) != 0 {
		t.Fatalf("expected bad buffered payload to be dropped, got %d items", len(fBuffer.items))
	}
}

func TestSendOnceDropsNonRetryableQueueBatch(t *testing.T) {
	cfg := testConfig()
	queue := newRecordQueue(10, "drop_oldest")
	queue.Enqueue([]queueRecord{
		{
			metric: domain.Metric{Name: "node.hostname", TextValue: "node-a"},
		},
	})

	r := &runner{
		cfg: cfg,
		deps: runtimeDeps{
			queue:  queue,
			sender: &fakeSender{err: sender.StatusError{Code: 400}},
		},
		retry: &retryState{},
		stats: newRuntimeStats(time.Now().UTC()),
		nowFn: func() time.Time {
			return time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC)
		},
		counter: newBatchCounter(),
	}

	r.sendOnce(context.Background())

	if queue.Len() != 0 {
		t.Fatalf("expected non-retryable batch to be dropped, got %d queued records", queue.Len())
	}
	if r.retry.consecutiveFailures != 0 {
		t.Fatalf("expected retry state to remain unchanged, got %d failures", r.retry.consecutiveFailures)
	}
}

type memoryBuffer struct {
	items []sender.Payload
}

func (m *memoryBuffer) Save(payload sender.Payload) error {
	m.items = append(m.items, payload)
	return nil
}

func (m *memoryBuffer) PeekOldest() (*buffer.BufferedBatch, error) {
	if len(m.items) == 0 {
		return nil, nil
	}
	return &buffer.BufferedBatch{
		FileName: m.items[0].Batch.BatchID + ".json",
		Payload:  m.items[0],
	}, nil
}

func (m *memoryBuffer) Delete(_ string) error {
	if len(m.items) == 0 {
		return nil
	}
	m.items = m.items[1:]
	return nil
}

func (m *memoryBuffer) Count() (int, error) { return len(m.items), nil }

func testConfig() *config.Config {
	cfg := &config.Config{}
	cfg.Agent.SchemaVersion = "v1"
	cfg.Agent.SourceType = "windows_exporter"
	cfg.Agent.AgentVersion = "0.1.0"
	cfg.Runtime.AgentID = "agent-1"
	cfg.Runtime.AgentName = "agent-name"
	cfg.Runtime.NodeID = "node-1"
	cfg.Runtime.Hostname = "HOST"
	cfg.Topology.Site = "lab-local"
	cfg.Topology.Environment = "poc"
	cfg.Node.DeviceType = "laptop"
	cfg.Runtime.RetryMinBackoff = time.Second
	cfg.Runtime.RetryMaxBackoff = 30 * time.Second
	cfg.Retry.RetryableStatusCodes = []int{503}
	cfg.Send.MaxBatchItems = 100
	return cfg
}
