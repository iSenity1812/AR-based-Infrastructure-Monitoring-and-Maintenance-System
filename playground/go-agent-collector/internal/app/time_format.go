package app

import "time"

var vietnamLocation = time.FixedZone("Asia/Ho_Chi_Minh", 7*60*60)

func formatCollectorTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.In(vietnamLocation).Format(time.RFC3339)
}
