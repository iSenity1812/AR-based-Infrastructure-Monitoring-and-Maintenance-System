package redis

import "time"

type Config struct {
	Addr            string
	Password        string
	DB              int
	ContextPrefix   string
	ContextTTL      time.Duration
	DashboardPrefix string
	DashboardTTL    time.Duration
	SnapshotPrefix  string
	SnapshotTTL     time.Duration
	WindowPrefix    string
	WindowTTL       time.Duration
	ConnectTimeout  time.Duration
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
}
