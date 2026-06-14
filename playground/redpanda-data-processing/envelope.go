package processing

import (
	"bytes"
	"encoding/binary"
	"fmt"
)

var envelopeMagic = [4]byte{'T', 'E', 'N', '1'}

type transportEnvelope struct {
	SchemaVersion string
	AgentID       string
	AgentName     string
	BatchID       string
	RecordCount   int32
	DroppedCount  int32
	SentAt        string
	ReceivedAt    string
	ContentType   string
	Encoding      string
	PayloadBytes  []byte
}

func unmarshalTransportEnvelope(data []byte) (transportEnvelope, error) {
	reader := bytes.NewReader(data)
	var magic [4]byte
	if _, err := reader.Read(magic[:]); err != nil {
		return transportEnvelope{}, err
	}
	if magic != envelopeMagic {
		return transportEnvelope{}, fmt.Errorf("invalid envelope magic")
	}

	var env transportEnvelope
	var err error
	if env.SchemaVersion, err = readString(reader); err != nil {
		return transportEnvelope{}, err
	}
	if env.AgentID, err = readString(reader); err != nil {
		return transportEnvelope{}, err
	}
	if env.AgentName, err = readString(reader); err != nil {
		return transportEnvelope{}, err
	}
	if env.BatchID, err = readString(reader); err != nil {
		return transportEnvelope{}, err
	}
	if err := binary.Read(reader, binary.BigEndian, &env.RecordCount); err != nil {
		return transportEnvelope{}, err
	}
	if err := binary.Read(reader, binary.BigEndian, &env.DroppedCount); err != nil {
		return transportEnvelope{}, err
	}
	if env.SentAt, err = readString(reader); err != nil {
		return transportEnvelope{}, err
	}
	if env.ReceivedAt, err = readString(reader); err != nil {
		return transportEnvelope{}, err
	}
	if env.ContentType, err = readString(reader); err != nil {
		return transportEnvelope{}, err
	}
	if env.Encoding, err = readString(reader); err != nil {
		return transportEnvelope{}, err
	}
	if env.PayloadBytes, err = readBytes(reader); err != nil {
		return transportEnvelope{}, err
	}
	return env, nil
}

func readString(reader *bytes.Reader) (string, error) {
	data, err := readBytes(reader)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func readBytes(reader *bytes.Reader) ([]byte, error) {
	var size uint32
	if err := binary.Read(reader, binary.BigEndian, &size); err != nil {
		return nil, err
	}
	data := make([]byte, size)
	if _, err := reader.Read(data); err != nil {
		return nil, err
	}
	return data, nil
}
