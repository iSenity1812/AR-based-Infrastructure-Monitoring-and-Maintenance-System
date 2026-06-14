package hostmeta

import (
	"net"
	"strings"
)

type NetworkMetadata struct {
	PrimaryIPv4 string
	MACAddress  string
}

func ResolveNetwork(preferredNIC, preferredIPv4 string) NetworkMetadata {
	interfaces, err := net.Interfaces()
	if err != nil {
		return NetworkMetadata{PrimaryIPv4: preferredIPv4}
	}

	if preferredIPv4 != "" {
		for _, iface := range interfaces {
			if metadata, ok := metadataForInterface(iface, preferredIPv4, preferredNIC); ok {
				return metadata
			}
		}
	}

	if preferredNIC != "" {
		for _, iface := range interfaces {
			if metadata, ok := metadataForInterface(iface, "", preferredNIC); ok {
				return metadata
			}
		}
	}

	for _, iface := range interfaces {
		if metadata, ok := metadataForInterface(iface, "", ""); ok {
			if metadata.PrimaryIPv4 != "" {
				return metadata
			}
		}
	}

	return NetworkMetadata{PrimaryIPv4: preferredIPv4}
}

func metadataForInterface(iface net.Interface, preferredIPv4, preferredNIC string) (NetworkMetadata, bool) {
	if (iface.Flags&net.FlagUp) == 0 || (iface.Flags&net.FlagLoopback) != 0 {
		return NetworkMetadata{}, false
	}
	if preferredNIC != "" && !matchesInterfaceName(iface.Name, preferredNIC) {
		return NetworkMetadata{}, false
	}

	addrs, err := iface.Addrs()
	if err != nil {
		return NetworkMetadata{}, false
	}

	var firstIPv4 string
	for _, addr := range addrs {
		ip := extractIPv4(addr)
		if ip == "" {
			continue
		}
		if firstIPv4 == "" {
			firstIPv4 = ip
		}
		if preferredIPv4 != "" && ip != preferredIPv4 {
			continue
		}
		return NetworkMetadata{
			PrimaryIPv4: ip,
			MACAddress:  normalizeMAC(iface.HardwareAddr),
		}, true
	}

	if preferredIPv4 != "" {
		return NetworkMetadata{}, false
	}
	if firstIPv4 == "" {
		return NetworkMetadata{}, false
	}
	return NetworkMetadata{
		PrimaryIPv4: firstIPv4,
		MACAddress:  normalizeMAC(iface.HardwareAddr),
	}, true
}

func extractIPv4(addr net.Addr) string {
	switch value := addr.(type) {
	case *net.IPNet:
		if ip := value.IP.To4(); ip != nil {
			return ip.String()
		}
	case *net.IPAddr:
		if ip := value.IP.To4(); ip != nil {
			return ip.String()
		}
	}
	return ""
}

func matchesInterfaceName(actual, expected string) bool {
	actual = strings.ToLower(strings.TrimSpace(actual))
	expected = strings.ToLower(strings.TrimSpace(expected))
	return actual == expected || strings.Contains(actual, expected) || strings.Contains(expected, actual)
}

func normalizeMAC(addr net.HardwareAddr) string {
	if len(addr) == 0 {
		return ""
	}
	return strings.ToUpper(addr.String())
}
