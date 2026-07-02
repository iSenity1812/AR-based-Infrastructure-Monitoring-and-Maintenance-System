package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"telemetry-shaping-service/internal/infrastructure/bootstrap"
	"telemetry-shaping-service/internal/infrastructure/config"
)

func main() {
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	app, err := bootstrap.NewApp(cfg)
	if err != nil {
		log.Fatalf("bootstrap app: %v", err)
	}
	defer app.Close()

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	log.Println("telemetry shaping service ingress reader started")
	if err := app.Run(ctx); err != nil {
		log.Fatalf("run app: %v", err)
	}

	log.Println("telemetry shaping service ingress reader stopped")
}
