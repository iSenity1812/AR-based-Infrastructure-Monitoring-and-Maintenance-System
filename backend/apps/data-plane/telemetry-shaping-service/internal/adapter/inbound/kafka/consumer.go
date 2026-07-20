package kafka

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"

	"telemetry-shaping-service/internal/application/dto"
	"telemetry-shaping-service/internal/application/usecases"
)

const (
	DefaultTopic      = "telemetry.normalized.received"
	DefaultConsumerID = "telemetry-shaping-service"
)

type Config struct {
	Brokers            []string
	Topic              string
	DLQTopic           string
	ConsumerGroup      string
	PollTimeout        time.Duration
	MaxInFlight        int
	MetricsLogInterval time.Duration
}

type Consumer struct {
	client             *kgo.Client
	handler            *usecases.IngressReader
	topic              string
	maxInFlight        int
	metrics            *Metrics
	metricsLogInterval time.Duration
}

func NewConsumer(cfg Config, handler *usecases.IngressReader) (*Consumer, error) {
	if len(cfg.Brokers) == 0 {
		return nil, fmt.Errorf("brokers are required")
	}

	if cfg.Topic == "" {
		cfg.Topic = DefaultTopic
	}

	if cfg.ConsumerGroup == "" {
		cfg.ConsumerGroup = DefaultConsumerID
	}

	if cfg.MaxInFlight <= 0 {
		cfg.MaxInFlight = 8
	}

	if cfg.MetricsLogInterval <= 0 {
		cfg.MetricsLogInterval = 30 * time.Second
	}

	client, err := kgo.NewClient(
		kgo.SeedBrokers(cfg.Brokers...),
		kgo.ConsumerGroup(cfg.ConsumerGroup),
		kgo.ConsumeTopics(cfg.Topic),
		kgo.DisableAutoCommit(),
		kgo.FetchIsolationLevel(kgo.ReadCommitted()),
	)
	if err != nil {
		return nil, fmt.Errorf("create kafka client: %w", err)
	}

	return &Consumer{
		client:             client,
		handler:            handler,
		topic:              cfg.Topic,
		maxInFlight:        cfg.MaxInFlight,
		metrics:            NewMetrics(),
		metricsLogInterval: cfg.MetricsLogInterval,
	}, nil
}

func (c *Consumer) Run(ctx context.Context, pollTimeout time.Duration) error {
	if pollTimeout <= 0 {
		pollTimeout = 5 * time.Second
	}

	go c.reportMetrics(ctx)

	for {
		if err := ctx.Err(); err != nil {
			return nil
		}

		pollCtx, cancel := context.WithTimeout(ctx, pollTimeout)
		fetches := c.client.PollFetches(pollCtx)
		cancel()

		if errs := fetches.Errors(); len(errs) > 0 {
			if c.isIdlePoll(errs) {
				c.metrics.IncPollTimeouts(uint64(len(errs)))
				continue
			}

			c.metrics.IncPollErrors(uint64(len(errs)))
			for _, fetchErr := range errs {
				log.Printf("poll fetch error topic=%s partition=%d err=%v", fetchErr.Topic, fetchErr.Partition, fetchErr.Err)
			}
			continue
		}

		records := make([]*kgo.Record, 0)
		fetches.EachRecord(func(record *kgo.Record) {
			records = append(records, record)
		})

		outcomes := c.processBatch(ctx, records)
		commitRecords := make([]*kgo.Record, 0, len(outcomes))
		for _, outcome := range outcomes {
			if outcome.result.Disposition == usecases.DispositionCommit {
				commitRecords = append(commitRecords, outcome.record)
			}
		}

		if len(commitRecords) == 0 {
			continue
		}

		if err := c.client.CommitRecords(ctx, commitRecords...); err != nil {
			return fmt.Errorf("commit records: %w", err)
		}

		c.metrics.IncCommitted(uint64(len(commitRecords)))
	}
}

func (c *Consumer) Close() {
	c.client.Close()
}

func buildEnvelope(record *kgo.Record) dto.IngressEnvelope {
	headers := make(map[string]string, len(record.Headers))
	for _, header := range record.Headers {
		headers[string(header.Key)] = string(header.Value)
	}

	messageKey := string(record.Key)
	agentID := strings.TrimSpace(messageKey)

	return dto.IngressEnvelope{
		Topic:      record.Topic,
		Partition:  record.Partition,
		Offset:     record.Offset,
		AgentID:    agentID,
		MessageKey: messageKey,
		ReceivedAt: time.Now().UTC(),
		Headers:    headers,
		RawPayload: append([]byte(nil), record.Value...),
	}
}

type recordOutcome struct {
	record   *kgo.Record
	envelope dto.IngressEnvelope
	result   usecases.HandoffResult
	err      error
}

func (c *Consumer) processBatch(ctx context.Context, records []*kgo.Record) []recordOutcome {
	if len(records) == 0 {
		return nil
	}

	workerCount := c.maxInFlight
	if workerCount > len(records) {
		workerCount = len(records)
	}

	jobs := make(chan *kgo.Record, len(records))
	results := make(chan recordOutcome, len(records))

	var wg sync.WaitGroup
	for range workerCount {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for record := range jobs {
				results <- c.processRecord(ctx, record)
			}
		}()
	}

	for _, record := range records {
		jobs <- record
	}
	close(jobs)

	wg.Wait()
	close(results)

	outcomes := make([]recordOutcome, 0, len(records))
	for outcome := range results {
		outcomes = append(outcomes, outcome)
	}

	return outcomes
}

func (c *Consumer) processRecord(ctx context.Context, record *kgo.Record) recordOutcome {
	c.metrics.IncConsumed(1)

	envelope := buildEnvelope(record)
	result, err := c.handler.Handle(ctx, envelope)
	if err != nil {
		log.Printf(
			"ingress handling error topic=%s partition=%d offset=%d key=%s reason=%s err=%v",
			envelope.Topic,
			envelope.Partition,
			envelope.Offset,
			envelope.MessageKey,
			result.Reason,
			err,
		)
	}

	switch {
	case result.Disposition == usecases.DispositionCommit:
		if errors.Is(err, usecases.ErrTransportValidation) {
			c.metrics.IncTransportValidationFailures(1)
		}
		if errors.Is(err, usecases.ErrPoisonMessage) {
			c.metrics.IncPoisonMessages(1)
		}
		if strings.HasSuffix(result.Reason, "_dlq") {
			c.metrics.IncDLQWrites(1)
		}
	case result.Disposition == usecases.DispositionRetry:
		c.metrics.IncRetried(1)
	}

	if err != nil && !errors.Is(err, usecases.ErrTransportValidation) && !errors.Is(err, usecases.ErrPoisonMessage) {
		c.metrics.IncHandlerErrors(1)
	}

	if result.Disposition == usecases.DispositionRetry {
		log.Printf(
			"record scheduled for retry topic=%s partition=%d offset=%d key=%s reason=%s",
			envelope.Topic,
			envelope.Partition,
			envelope.Offset,
			envelope.MessageKey,
			result.Reason,
		)
	}

	return recordOutcome{
		record:   record,
		envelope: envelope,
		result:   result,
		err:      err,
	}
}

func (c *Consumer) reportMetrics(ctx context.Context) {
	ticker := time.NewTicker(c.metricsLogInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			snapshot := c.metrics.Snapshot()
			log.Printf(
				"consumer metrics topic=%s consumed=%d committed=%d retried=%d dlq_writes=%d transport_validation_failures=%d poison_messages=%d handler_errors=%d poll_errors=%d poll_timeouts=%d",
				c.topic,
				snapshot.Consumed,
				snapshot.Committed,
				snapshot.Retried,
				snapshot.DLQWrites,
				snapshot.TransportValidationFailures,
				snapshot.PoisonMessages,
				snapshot.HandlerErrors,
				snapshot.PollErrors,
				snapshot.PollTimeouts,
			)
		}
	}
}

type Metrics struct {
	consumed                    atomic.Uint64
	committed                   atomic.Uint64
	retried                     atomic.Uint64
	dlqWrites                   atomic.Uint64
	transportValidationFailures atomic.Uint64
	poisonMessages              atomic.Uint64
	handlerErrors               atomic.Uint64
	pollErrors                  atomic.Uint64
	pollTimeouts                atomic.Uint64
}

type MetricsSnapshot struct {
	Consumed                    uint64
	Committed                   uint64
	Retried                     uint64
	DLQWrites                   uint64
	TransportValidationFailures uint64
	PoisonMessages              uint64
	HandlerErrors               uint64
	PollErrors                  uint64
	PollTimeouts                uint64
}

func NewMetrics() *Metrics {
	return &Metrics{}
}

func (m *Metrics) IncConsumed(value uint64) {
	m.consumed.Add(value)
}

func (m *Metrics) IncCommitted(value uint64) {
	m.committed.Add(value)
}

func (m *Metrics) IncRetried(value uint64) {
	m.retried.Add(value)
}

func (m *Metrics) IncDLQWrites(value uint64) {
	m.dlqWrites.Add(value)
}

func (m *Metrics) IncTransportValidationFailures(value uint64) {
	m.transportValidationFailures.Add(value)
}

func (m *Metrics) IncPoisonMessages(value uint64) {
	m.poisonMessages.Add(value)
}

func (m *Metrics) IncHandlerErrors(value uint64) {
	m.handlerErrors.Add(value)
}

func (m *Metrics) IncPollErrors(value uint64) {
	m.pollErrors.Add(value)
}

func (m *Metrics) IncPollTimeouts(value uint64) {
	m.pollTimeouts.Add(value)
}

func (m *Metrics) Snapshot() MetricsSnapshot {
	return MetricsSnapshot{
		Consumed:                    m.consumed.Load(),
		Committed:                   m.committed.Load(),
		Retried:                     m.retried.Load(),
		DLQWrites:                   m.dlqWrites.Load(),
		TransportValidationFailures: m.transportValidationFailures.Load(),
		PoisonMessages:              m.poisonMessages.Load(),
		HandlerErrors:               m.handlerErrors.Load(),
		PollErrors:                  m.pollErrors.Load(),
		PollTimeouts:                m.pollTimeouts.Load(),
	}
}

func (c *Consumer) isIdlePoll(errs []kgo.FetchError) bool {
	if len(errs) == 0 {
		return false
	}

	for _, fetchErr := range errs {
		if !errors.Is(fetchErr.Err, context.DeadlineExceeded) {
			return false
		}
	}

	return true
}
