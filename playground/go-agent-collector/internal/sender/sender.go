package sender

import (
	"context"
	"fmt"

	"github.com/iSenity1812/go-agent-collector/internal/config"
)

const (
	transportHTTP = "http"
	transportGRPC = "grpc"
)

// New selects the configured payload transport.
func New(cfg *config.Config) (interface {
	Send(ctx context.Context, payload Payload) error
}, error) {
	switch cfg.Runtime.SendTransport {
	case "", transportHTTP:
		return NewHTTPSender(cfg), nil
	case transportGRPC:
		return NewGRPCSender(cfg)
	default:
		return nil, fmt.Errorf("unsupported send transport %q", cfg.Runtime.SendTransport)
	}
}
