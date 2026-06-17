package adapter

import (
	"context"
	localca "ingestion-worker/deployment/local-ca"
	"ingestion-worker/internal/domain"
)

type PKIAdapter struct {
	ca *localca.LocalCA
}

func NewPKIAdapter(ca *localca.LocalCA) *PKIAdapter {
	return &PKIAdapter{ca: ca}
}

func (a *PKIAdapter) GenerateCredentials(ctx context.Context, agentID string) (*domain.Credentials, error) {
	cert, key, err := a.ca.GenerateCredentials(ctx, agentID)
	if err != nil {
		return nil, err
	}
	return &domain.Credentials{
		AgentID:     agentID,
		Certificate: cert,
		PrivateKey:  key,
	}, nil
}
