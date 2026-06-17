package adapter

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
	"sync"
	"sync/atomic"
	"time"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kerr"
	"github.com/twmb/franz-go/pkg/kgo"
)

func logf(format string, args ...any) {
	fmt.Printf("[Redpanda DEBUG] "+format+"\n", args...)
}

type RedPandaAdapter struct {
	client *kgo.Client
	topic  string

	queue chan *kgo.Record
	done  chan struct{}

	wg        sync.WaitGroup
	closeOnce sync.Once
	closed    atomic.Bool
}

func NewRedPandaAdapter(brokers []string, domainName, dataArea, status string) (port.TelemetryBrokerPort, error) {
	topicName := fmt.Sprintf("%s.%s.%s", domainName, dataArea, status)

	client, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.DefaultProduceTopic(topicName),
		kgo.RequiredAcks(kgo.AllISRAcks()),

		// COMPRESSION
		kgo.ProducerBatchCompression(kgo.ZstdCompression()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create client: %w", err)
	}

	// Ensure topic with a separate admin client so admin cleanup cannot
	// close the long-lived producer client by accident.
	adminClient, err := kgo.NewClient(kgo.SeedBrokers(brokers...))
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("failed to create admin client: %w", err)
	}
	defer adminClient.Close()

	admin := kadm.NewClient(adminClient)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	createResp, err := admin.CreateTopic(ctx, 1, 1, nil, topicName)
	if err != nil && !errors.Is(err, kerr.TopicAlreadyExists) {
		return nil, fmt.Errorf("failed create topic: %w", err)
	}
	if createResp.Err != nil && !errors.Is(createResp.Err, kerr.TopicAlreadyExists) {
		return nil, fmt.Errorf("failed create topic: %w", createResp.Err)
	}

	a := &RedPandaAdapter{
		client: client,
		topic:  topicName,
		queue:  make(chan *kgo.Record, 1000),
		done:   make(chan struct{}),
	}

	// start async worker
	go a.run()

	fmt.Printf("RedPandaAdapter ready topic=%s\n", topicName)

	return a, nil
}

func (a *RedPandaAdapter) run() {
	logf("worker started")
	for {
		select {

		case record := <-a.queue:
			logf("got record from queue key=%s", string(record.Key))
			a.wg.Add(1)
			logf("calling Produce async")

			recordKey := string(record.Key)
			a.client.Produce(context.Background(), record, func(r *kgo.Record, err error) {
				defer a.wg.Done()
				if err != nil {
					fmt.Printf("produce failed: %v\n", err)
					logf("PRODUCE FAILED envelopeKey=%s err=%v", recordKey, err)
				}
			})

		case <-a.done:
			fmt.Println("RedPanda worker shutting down")
			logf("STOP signal received (done channel closed)")

			// drain queue trước khi exit
			for {
				select {
				case record := <-a.queue:
					logf("DRAIN record key=%s", string(record.Key))
					a.wg.Add(1)
					recordKey := string(record.Key)
					a.client.Produce(context.Background(), record, func(r *kgo.Record, err error) {
						defer a.wg.Done()
						if err != nil {
							fmt.Printf("produce failed: %v\n", err)
						}
						logf("DRAIN record key=%s", recordKey)
					})
				default:
					logf("drain finished")
					return
				}
			}
		}
	}
}

func (a *RedPandaAdapter) PublishTelemetryEnvelope(ctx context.Context, envelope *domain.TelemetryEnvelope) error {
	if a.closed.Load() {
		logf("Publish called but adapter already closed")
		return errors.New("client closed")
	}

	payload, err := json.Marshal(envelope)
	if err != nil {
		return err
	}

	record := &kgo.Record{
		Topic: a.topic,
		Key:   []byte(envelope.EnvelopeID),
		Value: payload,
	}

	// async non-blocking enqueue
	select {
	case a.queue <- record:
		logf("enqueue SUCCESS envelope=%s", envelope.EnvelopeID)
		return nil
	case <-ctx.Done():
		logf("ctx cancelled envelope=%s", envelope.EnvelopeID)
		return ctx.Err()
	default:
		logf("QUEUE FULL envelope=%s", envelope.EnvelopeID)
		return fmt.Errorf("queue full, dropping envelope=%s", envelope.EnvelopeID)
	}
}

func (a *RedPandaAdapter) Close() error {
	a.closeOnce.Do(func() {
		a.closed.Store(true)

		// stop worker first
		close(a.done)

		// wait for all in-flight messages to be sent
		a.wg.Wait()

		a.client.Close()
	})

	return nil
}
