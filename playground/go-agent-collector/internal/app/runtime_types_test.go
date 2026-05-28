package app

import (
	"testing"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/domain"
)

func TestRecordQueueDropOldest(t *testing.T) {
	q := newRecordQueue(2, "drop_oldest")

	q.Enqueue([]queueRecord{
		{metric: domain.Metric{Name: "one"}, collectedAt: time.Unix(1, 0)},
		{metric: domain.Metric{Name: "two"}, collectedAt: time.Unix(2, 0)},
		{metric: domain.Metric{Name: "three"}, collectedAt: time.Unix(3, 0)},
	})

	records, dropped := q.Drain(10)
	if len(records) != 2 {
		t.Fatalf("expected 2 records, got %d", len(records))
	}
	if dropped != 1 {
		t.Fatalf("expected 1 dropped record, got %d", dropped)
	}
	if records[0].metric.Name != "two" || records[1].metric.Name != "three" {
		t.Fatalf("expected oldest record to be dropped, got %#v", records)
	}
}

func TestRecordQueueRequeueFront(t *testing.T) {
	q := newRecordQueue(10, "drop_oldest")
	q.Enqueue([]queueRecord{{metric: domain.Metric{Name: "tail"}}})

	q.RequeueFront([]queueRecord{{metric: domain.Metric{Name: "head"}}}, 2)
	records, dropped := q.Drain(10)

	if dropped != 2 {
		t.Fatalf("expected dropped count 2, got %d", dropped)
	}
	if len(records) != 2 {
		t.Fatalf("expected 2 records, got %d", len(records))
	}
	if records[0].metric.Name != "head" || records[1].metric.Name != "tail" {
		t.Fatalf("expected requeued records at front, got %#v", records)
	}
}
