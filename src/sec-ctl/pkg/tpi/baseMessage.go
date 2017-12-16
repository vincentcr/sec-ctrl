package tpi

import (
	"bytes"
	"fmt"
	"io"
	"strconv"
	"strings"
)

var crlf = []byte("\r\n")

// baseMessage represents a generic Envisalink TPI baseMessage
type baseMessage struct {
	Code int
	Data []byte
}

func (m baseMessage) write(w io.Writer) error {
	dat := append(m.encode(), crlf...)
	_, err := w.Write(dat)
	return err
}

func (m baseMessage) encode() []byte {
	enc := EncodeIntCode(m.Code)

	if m.Data != nil {
		enc = append(enc, m.Data...)
	}

	chk := msgChecksum(enc)
	dat := append(enc, []byte(chk)...)
	return dat
}

// ReadAvailableMessages reads all available messages from the supplied reader
func readAvailableMessages(reader io.Reader) ([]baseMessage, error) {

	packetBytes, err := readUntilMarker(reader, crlf)
	if err != nil {
		return nil, err
	}
	packets := bytes.Split(packetBytes, crlf)
	msgs := make([]baseMessage, 0, len(packets))
	for _, packet := range packets {
		if len(packet) > 0 {
			m, err := msgDecode(packet)
			if err != nil {
				return nil, err
			}
			msgs = append(msgs, m)
		}
	}
	return msgs, nil
}

// reads from the supplied reader until <marker> bytes are read as the last bytes
// of a Read call.
func readUntilMarker(reader io.Reader, marker []byte) ([]byte, error) {

	data := make([]byte, 0, 4096)
	buf := make([]byte, 2048)
	done := false

	markerLen := len(marker)

	for !done {
		nRead, err := reader.Read(buf)
		if err != nil {
			return nil, err
		}
		if nRead == 0 {
			return nil, fmt.Errorf("Unexpected end of input")
		}
		data = append(data, buf[:nRead]...)
		dataLen := len(data)
		if dataLen >= markerLen {
			// done when <marker bytes> are the last bytes of the transmission
			potentialMarker := data[dataLen-markerLen:]
			done = bytes.Compare(marker, potentialMarker) == 0
		}
	}

	return data, nil
}

func msgDecode(msgBytes []byte) (baseMessage, error) {
	if len(msgBytes) < 5 {
		return baseMessage{}, fmt.Errorf("Got %d bytes, need at least 5", len(msgBytes))
	}

	// CODE-DATA-CHECKSUM
	// code: 3 bytes
	// data: 0-n bytes
	// checksum: 2 bytes

	dataStart := 3
	dataEnd := len(msgBytes) - 2
	codeBytes := msgBytes[:dataStart]
	data := msgBytes[dataStart:dataEnd]
	expectedChecksum := string(msgBytes[dataEnd:])
	// verify checksum
	actualChecksum := msgChecksum(msgBytes[:dataEnd])
	if strings.ToLower(expectedChecksum) != strings.ToLower(actualChecksum) {
		return baseMessage{}, fmt.Errorf("failed to decode message %v: data %v, expected checksum %v, actual %v",
			msgBytes, data, expectedChecksum, actualChecksum)
	}

	code, err := DecodeIntCode(codeBytes)
	if err != nil {
		return baseMessage{}, err
	}

	msg := baseMessage{
		Code: code,
		Data: data,
	}

	return msg, nil
}

func msgChecksum(bytes []byte) string {
	var sum int
	for _, b := range bytes {
		sum += int(b)
	}

	sum = sum & 0xff
	checksum := fmt.Sprintf("%02X", sum)
	return checksum
}

// EncodeIntCode encodes an integer as a tpi code
func EncodeIntCode(code int) []byte {
	return []byte(fmt.Sprintf("%03d", code))
}

// DecodeIntCode parses a byte array as an integer
func DecodeIntCode(codeBytes []byte) (int, error) {
	codeInt, err := strconv.Atoi(string(codeBytes))
	if err != nil {
		return -1, fmt.Errorf("invalid code bytes %s", codeBytes)
	}
	return codeInt, nil
}
