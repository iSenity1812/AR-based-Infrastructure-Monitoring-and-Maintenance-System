package backend

import (
	"strconv"
	"strings"
)

func trimFloat(value float64) string {
	raw := strconv.FormatFloat(value, 'f', -1, 64)
	if !strings.Contains(raw, ".") {
		return raw
	}
	return strings.TrimRight(strings.TrimRight(raw, "0"), ".")
}

func trimInt(value int) string {
	return strconv.Itoa(value)
}
