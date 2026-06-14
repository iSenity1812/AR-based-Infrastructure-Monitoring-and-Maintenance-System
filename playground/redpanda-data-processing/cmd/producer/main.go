package main

import (
	"log"

	processing "redpanda-data-processing"
)

func main() {
	if err := processing.RunProducer(); err != nil {
		log.Fatal(err)
	}
}
