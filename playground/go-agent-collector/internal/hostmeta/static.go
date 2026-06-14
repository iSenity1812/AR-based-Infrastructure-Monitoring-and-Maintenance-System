package hostmeta

import "runtime"

type StaticMetadata struct {
	OSProduct string
	OSVersion string
	OSBuild   string

	HardwareSerial string

	LogicalCPUCount int
	CPUArchitecture string
}

func LoadStatic() StaticMetadata {
	meta := StaticMetadata{
		LogicalCPUCount: runtime.NumCPU(),
		CPUArchitecture: runtime.GOARCH,
	}
	enrichPlatformStatic(&meta)
	return meta
}
