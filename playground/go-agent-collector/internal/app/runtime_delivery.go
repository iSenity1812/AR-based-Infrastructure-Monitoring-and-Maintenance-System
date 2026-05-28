package app

import (
	"context"
	"errors"
	"fmt"
	"net"
	"time"

	"github.com/iSenity1812/go-agent-collector/internal/sender"
)

func (r *runner) sendOnce(ctx context.Context) {
	now := r.now()
	if !r.retry.ready(now) {
		return
	}

	replayed, err := r.replayBuffered(ctx, now)
	if err != nil {
		fmt.Printf("buffer replay failed: %v\n", err)
		return
	}
	if replayed {
		return
	}

	records, dropped := r.deps.queue.Drain(r.cfg.Send.MaxBatchItems)
	if len(records) == 0 {
		return
	}

	payload := buildPayload(r.cfg, records, dropped, r.counter, now)
	result, err := r.sendPayload(ctx, payload, true)
	if err != nil {
		if result.retryable && !result.persisted {
			r.deps.queue.RequeueFront(records, dropped)
		}
		r.stats.recordSendFailure(err, payload.Batch.BatchID)
		fmt.Printf(
			"send failed: records=%d retryable=%t pending=%d buffered=%d err=%v\n",
			len(records),
			result.retryable,
			r.deps.queue.Len(),
			r.bufferedCount(),
			err,
		)
		return
	}
	r.stats.recordSendSuccess(now, payload.Batch.BatchID)

	fmt.Printf(
		"send ok: batch=%s records=%d pending=%d buffered=%d at=%s\n",
		payload.Batch.BatchID,
		payload.Batch.RecordCount,
		r.deps.queue.Len(),
		r.bufferedCount(),
		now.Format(time.RFC3339),
	)
}

func (r *runner) replayBuffered(ctx context.Context, now time.Time) (bool, error) {
	if r.deps.buffer == nil {
		return false, nil
	}

	item, err := r.deps.buffer.PeekOldest()
	if err != nil {
		return false, err
	}
	if item == nil {
		return false, nil
	}

	result, err := r.sendPayload(ctx, item.Payload, false)
	if err != nil {
		r.stats.recordSendFailure(err, item.Payload.Batch.BatchID)
		if !result.retryable {
			if deleteErr := r.deps.buffer.Delete(item.FileName); deleteErr != nil {
				return true, deleteErr
			}
			r.stats.recordDropped(item.Payload.Batch.BatchID)
			return true, fmt.Errorf("batch=%s dropped after non-retryable failure: %w", item.Payload.Batch.BatchID, err)
		}
		return true, fmt.Errorf("batch=%s: %w", item.Payload.Batch.BatchID, err)
	}
	if err := r.deps.buffer.Delete(item.FileName); err != nil {
		return true, err
	}
	r.stats.recordReplaySuccess(now, item.Payload.Batch.BatchID)

	fmt.Printf(
		"replay ok: batch=%s buffered_remaining=%d at=%s\n",
		item.Payload.Batch.BatchID,
		r.bufferedCount(),
		now.Format(time.RFC3339),
	)
	return true, nil
}

type sendResult struct {
	persisted bool
	retryable bool
}

func (r *runner) sendPayload(ctx context.Context, payload sender.Payload, allowBuffer bool) (sendResult, error) {
	if err := r.deps.sender.Send(ctx, payload); err != nil {
		retryable := r.isRetryable(err)
		result := sendResult{retryable: retryable}
		if retryable {
			r.retry.schedule(r.now(), r.cfg.Runtime.RetryMinBackoff, r.cfg.Runtime.RetryMaxBackoff)
			if allowBuffer && r.deps.buffer != nil {
				if saveErr := r.deps.buffer.Save(payload); saveErr != nil {
					r.stats.recordBufferWriteFailure(saveErr, payload.Batch.BatchID)
					return result, fmt.Errorf("send error: %v; buffer save error: %w", err, saveErr)
				}
				result.persisted = true
				r.stats.recordBuffered(payload.Batch.BatchID)
			}
		}
		return result, err
	}

	r.retry.reset()
	return sendResult{}, nil
}

func (r *runner) isRetryable(err error) bool {
	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}

	var statusErr sender.StatusError
	if errors.As(err, &statusErr) {
		for _, code := range r.cfg.Retry.RetryableStatusCodes {
			if statusErr.Code == code {
				return true
			}
		}
		return false
	}

	return true
}
