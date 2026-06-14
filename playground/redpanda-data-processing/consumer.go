package processing

import (
	"context"
	"fmt"

	"github.com/twmb/franz-go/pkg/kgo"
)

func RunConsumer() error {
	ctx := context.Background()
	topic := "telemetry.grpc.raw"
	client, err := kgo.NewClient(
		kgo.SeedBrokers("localhost:19092"),
		kgo.ConsumerGroup("group-1"),
		kgo.ConsumeTopics(topic),
		kgo.AutoCommitMarks(),
	)
	if err != nil {
		return fmt.Errorf("create client: %w", err)
	}
	defer client.Close()

	fmt.Println("Consumer started...")

	for {
		fetches := client.PollFetches(ctx)

		if errs := fetches.Errors(); len(errs) > 0 {
			fmt.Printf("Error fetching records: %v\n", errs)
			continue
		}

		// process records
		fetches.EachRecord(func(r *kgo.Record) {
			envelope, err := unmarshalTransportEnvelope(r.Value)
			if err != nil {
				fmt.Printf(
					"Received undecodable record from topic %s at partition %d and offset %d: key=%s err=%v\n",
					r.Topic, r.Partition, r.Offset, string(r.Key), err,
				)
				return
			}
			fmt.Printf(
				"Received envelope topic=%s partition=%d offset=%d batch=%s agent=%s records=%d bytes=%d receivedAt=%s contentType=%s encoding=%s\n",
				r.Topic,
				r.Partition,
				r.Offset,
				envelope.BatchID,
				envelope.AgentID,
				envelope.RecordCount,
				len(envelope.PayloadBytes),
				envelope.ReceivedAt,
				envelope.ContentType,
				envelope.Encoding,
			)
		})
	}
}
