package domain

import "time"

type NodeLifecycle string

type NodeAssignment string

const (
	// DISCOVERED: Node just discovered via token, waiting for authority
	// ACTIVE: Admin approved, node is active and can be used for processing
	// UNASSIGNED: Waiting in queue, not yet assigned to any rack
	// ASSIGNED: Assigned to a rack

	// StateDiscovered: Máy mới vừa đăng ký thành công qua token chung, đang chờ kiểm duyệt
	// StateActive: Máy đã được Admin duyệt và cấp phép đẩy dữ liệu chính thức
	// AssignmentUnassigned: Máy nằm trong hàng đợi, chưa được gán vào tủ (Rack) nào
	// AssignmentAssigned: Máy đã được định vị vào một tủ (Rack) cụ thể trong hệ thống

	StateDiscovered      NodeLifecycle  = "DISCOVERED"
	StateActive          NodeLifecycle  = "ACTIVE"
	AssignmentUnassigned NodeAssignment = "UNASSIGNED"
	AssignmentAssigned   NodeAssignment = "ASSIGNED"
)

// Key for unique: hardwareSerial + macAddress
type HardwareInfo struct {
	PrimaryIPv4     string `json:"primaryIpv4"`
	MacAddress      string `json:"macAddress"`      // Vân tay card mạng (Dùng để chống trùng lặp)
	HardwareSerial  string `json:"hardwareSerial"`  // Số Serial của Mainboard/BIOS (Dùng làm khóa Idempotency)
	Vendor          string `json:"vendor"`          // Hãng sản xuất canonical (vd Dell, HPE, Lenovo)
	Model           string `json:"model"`           // Model canonical của node
	OSProduct       string `json:"osProduct"`       // Hệ điều hành (e.g., Windows 11, Ubuntu 22.04)
	LogicalCPUCount int    `json:"logicalCpuCount"` // Số luồng xử lý vật lý
	CPUArchitecture string `json:"cpuArchitecture"` // Kiến trúc chip (e.g., amd64, arm64)
}

type RegisterRequest struct {
	BootstrapToken  string       `json:"bootstrapToken"`  // Token dùng để đăng ký, được tạo sẵn và có thời hạn
	Hostname        string       `json:"hostname"`        // Tên máy tính của node
	DeviceType      string       `json:"deviceType"`      // Loại thiết bị (e.g., "PC", "Server", "Laptop")
	DiscoverySource string       `json:"discoverySource"` // Nguồn phát hiện node canonical
	HardwareInfo    HardwareInfo `json:"hardwareInfo"`    // Thông tin phần cứng của node
}

// Node đại diện cho một "Thực thể" (Entity) hoàn chỉnh được quản lý trong hệ thống
// Cấu trúc này sẽ được mã hóa và lưu trữ trực tiếp vào kho chứa chia sẻ Redis
type Node struct {
	AgentID         string         `json:"agentId"` // ID duy nhất do Worker sinh ra bằng UUID (e.g., node-msi-9x81)
	Hostname        string         `json:"hostname"`
	DeviceType      string         `json:"deviceType"`
	Source          string         `json:"source"`
	LifecycleState  NodeLifecycle  `json:"lifecycleState"`          // Mặc định ban đầu: DISCOVERED
	AssignmentState NodeAssignment `json:"assignmentState"`         // Mặc định ban đầu: UNASSIGNED
	LogicalRackID   string         `json:"logicalRackId,omitempty"` // Trống khi vừa đăng ký
	Hardware        HardwareInfo   `json:"hardware"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}

type Credentials struct {
	AgentID     string `json:"agentId"`     // ID của node được cấp phép
	Certificate []byte `json:"certificate"` // Chuỗi PEM chứa chứng chỉ X.509
	PrivateKey  []byte `json:"privateKey"`  // Chuỗi PEM chứa khóa riêng RSA
}
