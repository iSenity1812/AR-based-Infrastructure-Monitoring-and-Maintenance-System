package main

import (
	"context"
	"fmt"
	localca "ingestion-worker/deployment/local-ca"
	"ingestion-worker/internal/adapter"
	"ingestion-worker/internal/delivery"
	"ingestion-worker/internal/port"
	"ingestion-worker/internal/usecase"
	"log"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	pb "github.com/iSenity1812/ingestion-worker-contract/api/registration/v1"
	telemetrypb "github.com/iSenity1812/ingestion-worker-contract/api/telemetry/v1"
	"google.golang.org/grpc"
	"gopkg.in/yaml.v3"
)

type App struct {
	grpcServer       *grpc.Server
	telemetryAdapter port.TelemetryBrokerPort
	shutdownCtx      context.Context
	shutdownCancel   context.CancelFunc
}

type Config struct {
	Server struct {
		Port int `yaml:"port"`
	} `yaml:"server"`
	Auth struct {
		BootstrapToken string `yaml:"bootstrap_token"`
	} `yaml:"auth"`
	PKI struct {
		CACertPath string `yaml:"ca_cert_path"`
		CAKeyPath  string `yaml:"ca_key_path"`
		WorkDir    string `yaml:"work_dir"`
	} `yaml:"pki"`
	Redis struct {
		Address  string `yaml:"address"`
		Password string `yaml:"password"`
		DB       int    `yaml:"db"`
	} `yaml:"redis"`
	Broker struct {
		Brokers  []string `yaml:"brokers"`
		Domain   string   `yaml:"domain"`
		DataArea string   `yaml:"dataArea"`
		Status   string   `yaml:"status"`
	} `yaml:"broker"`
}

func main() {
	configFile, err := os.ReadFile("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to read config file: %v", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(configFile, &cfg); err != nil {
		log.Fatalf("Failed to parse config file: %v", err)
	}

	applyEnvOverrides(&cfg)

	log.Println("Starting system with gRPC, Redis, and broker integration...")

	caTool := localca.NewLocalCA(cfg.PKI.CACertPath, cfg.PKI.CAKeyPath, cfg.PKI.WorkDir)
	pkiAdapter := adapter.NewPKIAdapter(caTool)

	redisAdapter, err := adapter.NewRedisAdapter(cfg.Redis.Address, cfg.Redis.Password, cfg.Redis.DB)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Connected to Redis successfully")

	telemetryAdapter, err := adapter.NewRedPandaAdapter(cfg.Broker.Brokers, cfg.Broker.Domain, cfg.Broker.DataArea, cfg.Broker.Status)
	if err != nil {
		log.Fatalf("Failed to connect to broker: %v", err)
	}

	var broker port.TelemetryBrokerPort = telemetryAdapter

	regUseCase := usecase.NewRegistrationUseCase(cfg.Auth.BootstrapToken, pkiAdapter, redisAdapter)
	telemetryUseCase := usecase.NewTelemetryUseCase(redisAdapter, telemetryAdapter)

	grpcHandler := delivery.NewRegistrationHandler(regUseCase)
	telemetryHandler := delivery.NewTelemetryIngestHandler(telemetryUseCase)

	grpcServer := grpc.NewServer()

	pb.RegisterRegistrationServiceServer(grpcServer, grpcHandler)
	telemetrypb.RegisterTelemetryIngestServiceServer(grpcServer, telemetryHandler)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.Server.Port))
	if err != nil {
		log.Fatalf("Failed to listen on port %d: %v", cfg.Server.Port, err)
	}

	// shutdown context
	ctx, cancel := context.WithCancel(context.Background())
	app := &App{
		grpcServer:       grpcServer,
		telemetryAdapter: broker,
		shutdownCtx:      ctx,
		shutdownCancel:   cancel,
	}

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		// 1. Stop accepting new gRPC requests
		log.Println("Shutting down gRPC Server gracefully...")
		grpcServer.GracefulStop()

		// 3. wait small drain window
		time.Sleep(500 * time.Millisecond)

		// 4. close redpanda adapter
		log.Println("Closing telemetry adapter...")
		app.telemetryAdapter.Close()

		// 5. cancel main context to signal any other goroutines (if any)
		app.shutdownCancel()
		log.Println("Shutdown complete")
	}()

	log.Printf("Registration gRPC Server is listening on port %d", cfg.Server.Port)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("gRPC Server execution error: %v", err)
	}
}

func applyEnvOverrides(cfg *Config) {
	if value := os.Getenv("INGESTION_SERVER_PORT"); value != "" {
		if _, err := fmt.Sscanf(value, "%d", &cfg.Server.Port); err != nil {
			log.Printf("Ignoring invalid INGESTION_SERVER_PORT=%q: %v", value, err)
		}
	}
	if value := os.Getenv("INGESTION_REDIS_ADDRESS"); value != "" {
		cfg.Redis.Address = value
	}
	if value := os.Getenv("INGESTION_REDIS_PASSWORD"); value != "" {
		cfg.Redis.Password = value
	}
	if value := os.Getenv("INGESTION_REDIS_DB"); value != "" {
		if _, err := fmt.Sscanf(value, "%d", &cfg.Redis.DB); err != nil {
			log.Printf("Ignoring invalid INGESTION_REDIS_DB=%q: %v", value, err)
		}
	}
	if value := os.Getenv("INGESTION_BROKER_BROKERS"); value != "" {
		cfg.Broker.Brokers = splitAndTrim(value)
	}
	if value := os.Getenv("INGESTION_BROKER_DOMAIN"); value != "" {
		cfg.Broker.Domain = value
	}
	if value := os.Getenv("INGESTION_BROKER_DATA_AREA"); value != "" {
		cfg.Broker.DataArea = value
	}
	if value := os.Getenv("INGESTION_BROKER_STATUS"); value != "" {
		cfg.Broker.Status = value
	}
}

func splitAndTrim(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
