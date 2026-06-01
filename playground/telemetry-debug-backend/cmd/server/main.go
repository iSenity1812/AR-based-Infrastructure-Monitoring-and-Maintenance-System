package main

import (
	"log"
	"net/http"
	"os"

	"github.com/iSenity1812/telemetry-debug-backend/internal/backend"
)

func main() {
	addr := os.Getenv("TELEMETRY_BACKEND_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}

	server := backend.NewServer()
	log.Printf("telemetry debug backend listening on %s", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatal(err)
	}
}
