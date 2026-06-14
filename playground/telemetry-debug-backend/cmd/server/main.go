package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"strings"

	"github.com/iSenity1812/telemetry-debug-backend/internal/backend"
	"google.golang.org/grpc"
)

func main() {
	httpAddr := os.Getenv("TELEMETRY_BACKEND_ADDR")
	if httpAddr == "" {
		httpAddr = "127.0.0.1:8090"
	}
	grpcAddr := os.Getenv("TELEMETRY_BACKEND_GRPC_ADDR")
	if grpcAddr == "" {
		grpcAddr = "127.0.0.1:8091"
	}
	brokersEnv := os.Getenv("REDPANDA_BROKERS")
	if brokersEnv == "" {
		brokersEnv = "localhost:19092"
	}
	topic := os.Getenv("REDPANDA_TOPIC")
	if topic == "" {
		topic = "telemetry.grpc.raw"
	}

	publisher, err := backend.NewRedpandaPublisher(strings.Split(brokersEnv, ","), topic)
	if err != nil {
		log.Fatal(err)
	}
	defer publisher.Close()

	server := backend.NewServer(publisher, topic)

	go func() {
		log.Printf("telemetry debug backend http listening on %s", httpAddr)
		if err := http.ListenAndServe(httpAddr, server.Handler()); err != nil {
			log.Fatal(err)
		}
	}()

	lis, err := net.Listen("tcp", grpcAddr)
	if err != nil {
		log.Fatal(err)
	}
	grpcServer := grpc.NewServer()
	backend.RegisterGRPC(grpcServer, server)

	log.Printf("telemetry debug backend grpc listening on %s topic=%s", grpcAddr, topic)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
