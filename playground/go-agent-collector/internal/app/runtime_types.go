package app

import (
	"context"
	"sync"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/buffer"
	"github.com/iSenity1812/go-agent-collector/internal/domain"
	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

type queueRecord struct {
	metric      domain.Metric
	collectedAt time.Time
}

type recordQueue struct {
	mu             sync.Mutex
	items          []queueRecord
	maxRecords     int
	overflowPolicy string
	dropped        int
}

func newRecordQueue(maxRecords int, overflowPolicy string) *recordQueue {
	return &recordQueue{
		maxRecords:     maxRecords,
		overflowPolicy: overflowPolicy,
	}
}

func (q *recordQueue) Enqueue(records []queueRecord) {
	q.mu.Lock()
	defer q.mu.Unlock()

	for _, record := range records {
		if q.maxRecords > 0 && len(q.items) >= q.maxRecords {
			if q.overflowPolicy == "drop_oldest" {
				q.items = q.items[1:]
				q.dropped++
			} else {
				q.dropped++
				continue
			}
		}
		q.items = append(q.items, record)
	}
}

func (q *recordQueue) Drain(maxItems int) ([]queueRecord, int) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.items) == 0 {
		return nil, 0
	}
	if maxItems <= 0 || maxItems > len(q.items) {
		maxItems = len(q.items)
	}

	drained := append([]queueRecord(nil), q.items[:maxItems]...)
	q.items = append([]queueRecord(nil), q.items[maxItems:]...)

	dropped := q.dropped
	q.dropped = 0
	return drained, dropped
}

func (q *recordQueue) RequeueFront(records []queueRecord, dropped int) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(records) > 0 {
		q.items = append(append([]queueRecord(nil), records...), q.items...)
	}
	q.dropped += dropped
	if q.maxRecords > 0 && len(q.items) > q.maxRecords {
		overflow := len(q.items) - q.maxRecords
		q.items = q.items[:q.maxRecords]
		q.dropped += overflow
	}
}

func (q *recordQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.items)
}

type runtimeDeps struct {
	source sourceCollector
	mapper metricMapper
	sender payloadSender
	buffer bufferedStore
	queue  *recordQueue
}

type sourceCollector interface {
	Collect() ([]domain.Metric, error)
}

type metricMapper interface {
	Map(raw []domain.Metric) ([]domain.Metric, error)
}

type payloadSender interface {
	Send(ctx context.Context, payload sender.Payload) error
}

type bufferedStore interface {
	Save(payload sender.Payload) error
	PeekOldest() (*buffer.BufferedBatch, error)
	Delete(fileName string) error
	Count() (int, error)
}
