//go:build windows

package hostmeta

import (
	"fmt"
	"strings"

	"github.com/StackExchange/wmi"
	"golang.org/x/sys/windows/registry"
)

type win32BaseBoard struct {
	SerialNumber string
}

type windowsVersionInfo struct {
	Product string
	Version string
	Build   string
}

func enrichPlatformStatic(meta *StaticMetadata) {
	if info := readWindowsVersionInfo(); info.Product != "" {
		meta.OSProduct = normalizeWindowsProduct(info.Product, info.Build)
		meta.OSVersion = info.Version
		meta.OSBuild = info.Build
	}
	if serial := readHardwareSerial(); serial != "" {
		meta.HardwareSerial = serial
	}
}

func normalizeWindowsProduct(product, build string) string {
	// Windows 11 has the same product name as Windows 10, so we need to differentiate them by build number
	if strings.Contains(product, "Windows 10") {
		if buildNum := parseBuildNumber(build); buildNum >= 22000 {
			return "Windows 11"
		}
	}
	return product
}

func parseBuildNumber(build string) int {
	var num int
	fmt.Sscanf(build, "%d", &num)
	return num
}

func readWindowsVersionInfo() windowsVersionInfo {
	key, err := registry.OpenKey(
		registry.LOCAL_MACHINE,
		`SOFTWARE\Microsoft\Windows NT\CurrentVersion`,
		registry.QUERY_VALUE,
	)

	if err != nil {
		return windowsVersionInfo{}
	}
	defer key.Close()

	product, _, err := key.GetStringValue("ProductName")
	version, _, err := key.GetStringValue("DisplayVersion")
	build, _, err := key.GetStringValue("CurrentBuild")

	if err != nil {
		return windowsVersionInfo{}
	}

	return windowsVersionInfo{
		Product: product,
		Version: version,
		Build:   build,
	}
}

func readHardwareSerial() string {
	var boards []win32BaseBoard
	if err := wmi.Query("SELECT SerialNumber FROM Win32_BaseBoard", &boards); err != nil {
		return ""
	}
	for _, board := range boards {
		serial := strings.TrimSpace(board.SerialNumber)
		if serial != "" {
			return serial
		}
	}
	return ""
}
