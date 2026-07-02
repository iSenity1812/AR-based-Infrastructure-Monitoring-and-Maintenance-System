package redis

import (
	"context"
	"sort"
	"strings"
	"sync"

	"telemetry-shaping-service/internal/domain/entities"
)

type MemoryDashboardStore struct {
	mu        sync.RWMutex
	documents map[string]entities.DashboardDocument
}

func NewMemoryDashboardStore() *MemoryDashboardStore {
	return &MemoryDashboardStore{
		documents: make(map[string]entities.DashboardDocument),
	}
}

func (s *MemoryDashboardStore) UpsertDashboards(_ context.Context, documents []entities.DashboardDocument) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, document := range documents {
		s.documents[s.dashboardKey(document.AgentID, document.ScopeType, document.ScopeID)] = document
	}

	return nil
}

func (s *MemoryDashboardStore) ListDashboards() []entities.DashboardDocument {
	s.mu.RLock()
	defer s.mu.RUnlock()

	keys := make([]string, 0, len(s.documents))
	for key := range s.documents {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]entities.DashboardDocument, 0, len(keys))
	for _, key := range keys {
		out = append(out, s.documents[key])
	}
	return out
}

func (s *MemoryDashboardStore) dashboardKey(agentID, scopeType, scopeID string) string {
	return strings.Join([]string{agentID, scopeType, scopeID}, "|")
}
