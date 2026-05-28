package app

import "time"

type retryState struct {
	consecutiveFailures int
	nextAttemptAt       time.Time
}

func (r *retryState) reset() {
	r.consecutiveFailures = 0
	r.nextAttemptAt = time.Time{}
}

func (r *retryState) schedule(now time.Time, minBackoff, maxBackoff time.Duration) {
	r.consecutiveFailures++
	backoff := minBackoff
	for i := 1; i < r.consecutiveFailures; i++ {
		backoff *= 2
		if backoff >= maxBackoff {
			backoff = maxBackoff
			break
		}
	}
	if backoff > maxBackoff {
		backoff = maxBackoff
	}
	r.nextAttemptAt = now.Add(backoff)
}

func (r *retryState) ready(now time.Time) bool {
	return r.nextAttemptAt.IsZero() || !now.Before(r.nextAttemptAt)
}
