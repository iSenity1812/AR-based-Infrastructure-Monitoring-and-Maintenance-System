package redis

import (
	"context"
	"sort"
	"strings"
	"sync"

	"telemetry-shaping-service/internal/domain/entities"
)

type MemoryContextStore struct {
	mu       sync.RWMutex
	contexts map[string]entities.ContextDocument
}

func NewMemoryContextStore() *MemoryContextStore {
	return &MemoryContextStore{
		contexts: make(map[string]entities.ContextDocument),
	}
}

func (s *MemoryContextStore) UpsertContexts(_ context.Context, documents []entities.ContextDocument) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, document := range documents {
		key := s.contextKey(document.AgentID, document.ScopeType, document.ScopeID)
		current, ok := s.contexts[key]
		if ok && current.BatchSequence > document.BatchSequence {
			continue
		}
		s.contexts[key] = document
	}

	return nil
}

func (s *MemoryContextStore) ListContexts() []entities.ContextDocument {
	s.mu.RLock()
	defer s.mu.RUnlock()

	keys := make([]string, 0, len(s.contexts))
	for key := range s.contexts {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]entities.ContextDocument, 0, len(keys))
	for _, key := range keys {
		out = append(out, s.contexts[key])
	}
	return out
}

func (s *MemoryContextStore) contextKey(agentID, scopeType, scopeID string) string {
	return strings.Join([]string{agentID, scopeType, scopeID}, "|")
}
