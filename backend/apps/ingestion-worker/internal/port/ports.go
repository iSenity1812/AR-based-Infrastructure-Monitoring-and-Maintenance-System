package port

import (
	"context"
	"ingestion-worker/internal/domain"
)

type PKIPort interface {
	GenerateCredentials(ctx context.Context, agentID string) (*domain.Credentials, error)
}

type NodeRepositoryPort interface {
	SaveNode(ctx context.Context, node *domain.Node) error
	FindNodeByAgentID(ctx context.Context, agentID string) (*domain.Node, error)
}

type RegistrationUseCasePort interface {
	Register(ctx context.Context, req *domain.RegisterRequest) (*domain.Credentials, error)
}
