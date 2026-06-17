//go:build windows

package hostmeta

import "testing"

func TestReadComputerSystemInfo(t *testing.T) {
	oldQuery := queryWMI
	t.Cleanup(func() {
		queryWMI = oldQuery
	})

	queryWMI = func(query string, dst interface{}, _ ...interface{}) error {
		if query != "SELECT Manufacturer, Model FROM Win32_ComputerSystem" {
			t.Fatalf("unexpected WMI query: %s", query)
		}

		systems, ok := dst.(*[]win32ComputerSystem)
		if !ok {
			t.Fatalf("unexpected target type %T", dst)
		}

		*systems = []win32ComputerSystem{{
			Manufacturer: "Dell Inc.",
			Model:        "PowerEdge R740",
		}}
		return nil
	}

	vendor, model := readComputerSystemInfo()
	if vendor != "Dell Inc." {
		t.Fatalf("expected vendor to be %q, got %q", "Dell Inc.", vendor)
	}
	if model != "PowerEdge R740" {
		t.Fatalf("expected model to be %q, got %q", "PowerEdge R740", model)
	}
}
