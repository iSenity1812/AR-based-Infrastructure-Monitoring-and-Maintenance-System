package usecase

import "time"

var vietnamLocation = time.FixedZone("Asia/Ho_Chi_Minh", 7*60*60)

func formatVietnamTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.In(vietnamLocation).Format(time.RFC3339Nano)
}
