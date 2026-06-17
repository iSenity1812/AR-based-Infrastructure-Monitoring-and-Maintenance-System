package delivery

import (
	"context"
	"errors"
	"fmt"
	pb "ingestion-worker/api/registration/v1"
	"ingestion-worker/internal/domain"
	"ingestion-worker/internal/port"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type RegistrationHandler struct {
	pb.UnimplementedRegistrationServiceServer
	useCase port.RegistrationUseCasePort
}

func NewRegistrationHandler(uc port.RegistrationUseCasePort) *RegistrationHandler {
	return &RegistrationHandler{useCase: uc}
}

func (h *RegistrationHandler) RegisterNode(ctx context.Context, req *pb.RegisterNodeRequest) (*pb.RegisterNodeResponse, error) {
	if req == nil {
		return nil, errors.New("invalid request: request cannot be nil")
	}

	// Print để kiểm tra dữ liệu nhận được từ gRPC request
	fmt.Printf("Received RegisterNodeRequest: BootstrapToken=%s, Hostname=%s\n", req.BootstrapToken, req.Hostname)
	if dn := clientCertDN(ctx); dn != "" {
		fmt.Printf("Forwarded client identity from nginx: %s\n", dn)
	}

	// 1. Mapping protobuf request to domain model

	domainReq := &domain.RegisterRequest{
		BootstrapToken:  req.GetBootstrapToken(),
		Hostname:        req.GetHostname(),
		DeviceType:      req.GetDeviceType(),
		DiscoverySource: req.GetDiscoverySource(),
		HardwareInfo: domain.HardwareInfo{
			PrimaryIPv4:     req.GetHardwareInfo().GetPrimaryIpv4(),
			MacAddress:      req.GetHardwareInfo().GetMacAddress(),
			HardwareSerial:  req.GetHardwareInfo().GetHardwareSerial(),
			Vendor:          req.GetHardwareInfo().GetVendor(),
			Model:           req.GetHardwareInfo().GetModel(),
			OSProduct:       req.GetHardwareInfo().GetOsProduct(),
			LogicalCPUCount: int(req.GetHardwareInfo().GetLogicalCpuCount()),
			CPUArchitecture: req.GetHardwareInfo().GetCpuArchitecture(),
		},
	}

	// 2. Call use case
	cred, err := h.useCase.Register(ctx, domainReq)
	if err != nil {
		// Trả về mã lỗi gRPC tương ứng
		return nil, status.Errorf(codes.PermissionDenied, "registration failed: %v", err)
	}

	// 3. Mapping domain response to protobuf response
	return &pb.RegisterNodeResponse{
		AgentId:     cred.AgentID,
		Certificate: cred.Certificate,
		PrivateKey:  cred.PrivateKey,
	}, nil
}

func clientCertDN(ctx context.Context) string {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return ""
	}
	values := md.Get("x-client-cert-dn")
	if len(values) == 0 {
		return ""
	}
	return values[0]
}
