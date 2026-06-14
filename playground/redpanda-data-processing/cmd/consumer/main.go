package main

import (
	"log"

	processing "redpanda-data-processing"
)

func main() {
	if err := processing.RunConsumer(); err != nil {
		log.Fatal(err)
	}
}
