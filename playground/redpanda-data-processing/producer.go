package processing

import (
	"context"
	"fmt"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
)

func RunProducer() error {
	ctx := context.Background()

	client, err := kgo.NewClient(
		kgo.SeedBrokers("localhost:19092"),
	)
	if err != nil {
		return fmt.Errorf("create client: %w", err)
	}
	defer client.Close()

	adm := kadm.NewClient(client)

	// create topic
	resp, err := adm.CreateTopics(ctx, 1, 1, nil, "test-topic")
	if err != nil {
		return fmt.Errorf("create topic: %w", err)
	}
	fmt.Printf("Topic created: %v\n", resp)

	record := &kgo.Record{
		Topic: "test-topic",
		Key:   []byte("key"),
		Value: []byte("hello redpanda"),
	}

	client.Produce(context.Background(), record, func(r *kgo.Record, err error) {
		if err != nil {
			fmt.Printf("Error producing record: %v\n", err)
			return
		}
		fmt.Printf(
			"Record produced to topic %s at partition %d and offset %d\n",
			r.Topic, r.Partition, r.Offset,
		)
	})
	client.Flush(context.Background())
	return nil
}
