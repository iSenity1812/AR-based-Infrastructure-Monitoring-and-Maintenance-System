package mmi

import (
	"fmt"
	"log"

	"github.com/StackExchange/wmi"
)

// THU NGHIEM 
type Win32_ComputerSystem struct {
	Manufacturer string
	Model        string
}

func main() {
	var systems []Win32_ComputerSystem

	err := wmi.Query(
		"SELECT Manufacturer, Model FROM Win32_ComputerSystem",
		&systems,
	)
	if err != nil {
		log.Fatalf("WMI query failed: %v", err)
	}

	if len(systems) == 0 {
		fmt.Println("No computer system information found")
		return
	}

	for _, s := range systems {
		fmt.Printf("Manufacturer: %s\n", s.Manufacturer)
		fmt.Printf("Model: %s\n", s.Model)
	}
}
