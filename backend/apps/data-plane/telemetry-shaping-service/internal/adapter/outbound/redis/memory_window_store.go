package redis

import (
	"context"
	"sort"
	"sync"

	"telemetry-shaping-service/internal/domain/entities"
)

type MemoryWindowStore struct {
	mu     sync.RWMutex
	series map[string]entities.WindowSeries
}

func NewMemoryWindowStore() *MemoryWindowStore {
	return &MemoryWindowStore{
		series: make(map[string]entities.WindowSeries),
	}
}

func (s *MemoryWindowStore) UpsertWindowSeries(
	_ context.Context,
	series []entities.WindowSeries,
	pointLimit int,
) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	trimmedTotal := 0
	for _, incoming := range series {
		current, ok := s.series[incoming.SeriesKey]
		if !ok {
			current = incoming
		} else {
			current.AgentID = incoming.AgentID
			current.MetricKey = incoming.MetricKey
			current.ScopeType = incoming.ScopeType
			current.ScopeID = incoming.ScopeID
			current.Source = incoming.Source
			current.Unit = incoming.Unit
			current.BatchSequence = incoming.BatchSequence
			current.UpdatedAt = incoming.UpdatedAt
			current.Points = append(current.Points, incoming.Points...)
		}

		if pointLimit > 0 && len(current.Points) > pointLimit {
			trimmedTotal += len(current.Points) - pointLimit
			current.Points = append([]entities.WindowPoint(nil), current.Points[len(current.Points)-pointLimit:]...)
		}

		s.series[incoming.SeriesKey] = current
	}

	return trimmedTotal, nil
}

func (s *MemoryWindowStore) ListWindowSeries() []entities.WindowSeries {
	s.mu.RLock()
	defer s.mu.RUnlock()

	keys := make([]string, 0, len(s.series))
	for key := range s.series {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]entities.WindowSeries, 0, len(keys))
	for _, key := range keys {
		out = append(out, s.series[key])
	}
	return out
}
