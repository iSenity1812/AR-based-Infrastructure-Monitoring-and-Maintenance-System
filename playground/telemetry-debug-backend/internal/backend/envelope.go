package backend

import (
	"bytes"
	"encoding/binary"
	"fmt"
)

var envelopeMagic = [4]byte{'T', 'E', 'N', '1'}

type TransportEnvelope struct {
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

func (e TransportEnvelope) MarshalBinary() ([]byte, error) {
	var buf bytes.Buffer
	buf.Write(envelopeMagic[:])
	writeStringField(&buf, e.SchemaVersion)
	writeStringField(&buf, e.AgentID)
	writeStringField(&buf, e.AgentName)
	writeStringField(&buf, e.BatchID)
	if err := binary.Write(&buf, binary.BigEndian, e.RecordCount); err != nil {
		return nil, err
	}
	if err := binary.Write(&buf, binary.BigEndian, e.DroppedCount); err != nil {
		return nil, err
	}
	writeStringField(&buf, e.SentAt)
	writeStringField(&buf, e.ReceivedAt)
	writeStringField(&buf, e.ContentType)
	writeStringField(&buf, e.Encoding)
	writeBytesField(&buf, e.PayloadBytes)
	return buf.Bytes(), nil
}

func UnmarshalTransportEnvelope(data []byte) (TransportEnvelope, error) {
	reader := bytes.NewReader(data)
	var magic [4]byte
	if _, err := reader.Read(magic[:]); err != nil {
		return TransportEnvelope{}, err
	}
	if magic != envelopeMagic {
		return TransportEnvelope{}, fmt.Errorf("invalid envelope magic")
	}

	var env TransportEnvelope
	var err error
	if env.SchemaVersion, err = readStringField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	if env.AgentID, err = readStringField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	if env.AgentName, err = readStringField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	if env.BatchID, err = readStringField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	if err := binary.Read(reader, binary.BigEndian, &env.RecordCount); err != nil {
		return TransportEnvelope{}, err
	}
	if err := binary.Read(reader, binary.BigEndian, &env.DroppedCount); err != nil {
		return TransportEnvelope{}, err
	}
	if env.SentAt, err = readStringField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	if env.ReceivedAt, err = readStringField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	if env.ContentType, err = readStringField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	if env.Encoding, err = readStringField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	if env.PayloadBytes, err = readBytesField(reader); err != nil {
		return TransportEnvelope{}, err
	}
	return env, nil
}

func writeStringField(buf *bytes.Buffer, value string) {
	writeBytesField(buf, []byte(value))
}

func writeBytesField(buf *bytes.Buffer, value []byte) {
	_ = binary.Write(buf, binary.BigEndian, uint32(len(value)))
	buf.Write(value)
}

func readStringField(reader *bytes.Reader) (string, error) {
	data, err := readBytesField(reader)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func readBytesField(reader *bytes.Reader) ([]byte, error) {
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
