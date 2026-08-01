package adapter

import (
	"testing"
	"time"

	"ingestion-worker/internal/domain"
)

func TestNodeTTLReturns24HoursForDiscoveredNodes(t *testing.T) {
	node := &domain.Node{
		LifecycleState: domain.StateDiscovered,
	}

	if got := nodeTTL(node); got != discoveredNodeTTL {
		t.Fatalf("expected discovered node TTL %v, got %v", discoveredNodeTTL, got)
	}
}

func TestNodeTTLReturnsNoExpirationForActiveNodes(t *testing.T) {
	node := &domain.Node{
		LifecycleState: domain.StateActive,
	}

	if got := nodeTTL(node); got != 0 {
		t.Fatalf("expected active node to have no TTL, got %v", got)
	}
}

func TestNodeTTLReturnsNoExpirationForNilNode(t *testing.T) {
	if got := nodeTTL(nil); got != 0 {
		t.Fatalf("expected nil node to have no TTL, got %v", got)
	}
}

func TestDiscoveredNodeTTLConstantIs24Hours(t *testing.T) {
	if discoveredNodeTTL != 24*time.Hour {
		t.Fatalf("expected discovered node TTL to be 24h, got %v", discoveredNodeTTL)
	}
}
