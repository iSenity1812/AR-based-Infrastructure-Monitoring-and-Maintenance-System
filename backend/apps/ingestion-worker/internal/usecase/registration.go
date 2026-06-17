// Xác thực Bootstrap Token bằng giải thuật constant-time.
// Tạo ngẫu nhiên một mã AgentID định dạng node-msi-xxxx.
// Tạo thực thể Node mới với trạng thái mặc định: DISCOVERED và UNASSIGNED.
// Gọi PKI phát hành chứng chỉ và lưu thông tin Node vào Redis.

package usecase

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"
	"ingestion-worker/pkg/auth"
	"time"
)

type RegistrationUseCase struct {
	externalToken string
	pkiPort       port.PKIPort
	nodeRepoPort  port.NodeRepositoryPort
}

func NewRegistrationUseCase(externalToken string, pkiPort port.PKIPort, nodeRepoPort port.NodeRepositoryPort) *RegistrationUseCase {
	return &RegistrationUseCase{
		externalToken: externalToken,
		pkiPort:       pkiPort,
		nodeRepoPort:  nodeRepoPort,
	}
}

func (uc *RegistrationUseCase) Register(ctx context.Context, req *domain.RegisterRequest) (*domain.Credentials, error) {
	// 1. Xác thực token bằng giải thuật constant-time
	if !auth.VerifyToken(req.BootstrapToken, uc.externalToken) {
		return nil, errors.New("registration failed: invalid token")
	}

	// 2. Tu generate agentId
	agentID := generateAgentID()

	// 3. yeu cầu PKI phát hành chứng chỉ
	creds, err := uc.pkiPort.GenerateCredentials(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate credentials: %w", err)
	}

	// 4. Tạo thực thể Node mới với trạng thái mặc định: DISCOVERED và UNASSIGNED
	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		return nil, fmt.Errorf("failed to load timezone: %w", err)
	}
	now := time.Now().In(loc)
	node := &domain.Node{
		AgentID:         agentID,
		Hostname:        req.Hostname,
		DeviceType:      req.DeviceType,
		Source:          req.DiscoverySource,
		LifecycleState:  domain.StateDiscovered,      // Mặc định ban đầu: DISCOVERED
		AssignmentState: domain.AssignmentUnassigned, // Mặc định ban đầu: UNASSIGNED
		Hardware:        req.HardwareInfo,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	// 5. Lưu thông tin Node vào Redis
	err = uc.nodeRepoPort.SaveNode(ctx, node)
	if err != nil {
		return nil, fmt.Errorf("registration: failed to record node in database: %w", err)
	}

	return creds, nil
}

func generateAgentID() string {
	b := make([]byte, 4)
	_, err := rand.Read(b)
	if err != nil {
		// Cơ chế dự phòng trong trường hợp hiếm hoi lỗi sinh số ngẫu nhiên hệ thống
		return fmt.Sprintf("node-msi-%d", time.Now().UnixNano()%10000)
	}
	return fmt.Sprintf("node-msi-%x", b)
}
