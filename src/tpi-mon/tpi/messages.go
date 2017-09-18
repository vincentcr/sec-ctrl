package tpi

import (
	"fmt"
	"io"
	"tpi-mon/tpi/proto"
)

var crlf = []byte("\r\n")

//
type ClientMessage struct {
	Code ClientCode
	Data []byte
}

func (m ClientMessage) String() string {
	return fmt.Sprintf("ClientMessage{code: %s(%d), data: '%s'}", m.Code.String(), m.Code, m.Data)
}

func writeCientMessage(m ClientMessage, w io.Writer) error {
	tpiM := proto.TPIMessage{Code: int(m.Code), Data: m.Data}
	return tpiM.Write(w)
}

type ServerMessage struct {
	Code ServerCode
	Data []byte
}

func (m ServerMessage) String() string {
	return fmt.Sprintf("ServerMessage{code: %s(%d), data: '%s'}", m.Code.stringHuman(), m.Code, m.Data)
}

func readAvailableServerMessages(r io.Reader) ([]ServerMessage, error) {

	msgs, err := proto.ReadAvailableMessages(r)
	if err != nil {
		return nil, err
	}

	serverMsgs := make([]ServerMessage, len(msgs))
	for i, m := range msgs {
		serverMsgs[i] = ServerMessage{Code: ServerCode(m.Code), Data: m.Data}
	}

	return serverMsgs, nil

}

// func msgWrite(writer io.Writer, msg ClientMessage) error {
// 	msgBytes := msgEncode(msg)

// 	// fmt.Printf("Sending %v (raw: %v)\n", msg, msgBytes)

// 	_, err := writer.Write(msgBytes)
// 	return err
// }

// func msgEncode(msg ClientMessage) []byte {
// 	encoded := []byte(fmt.Sprintf("%03d", msg.Code))

// 	if msg.Data != nil {
// 		encoded = append(encoded, msg.Data...)
// 	}

// 	checksum := msgChecksum(encoded)

// 	return append(append(encoded, []byte(checksum)...), crlf...)
// }

// func msgReadAvailable(reader io.Reader) ([]ServerMessage, error) {
// 	packetBytes, err := readUntilMarker(reader, crlf)
// 	if err != nil {
// 		return nil, fmt.Errorf("")
// 	}
// 	packets := bytes.Split(packetBytes, crlf)
// 	msgs := make([]ServerMessage, 0, len(packets))
// 	for _, packet := range packets {
// 		if len(packet) > 0 {
// 			msg, err := msgDecode(packet)
// 			if err != nil {
// 				return nil, err
// 			}
// 			// fmt.Printf("Received %v (raw: %v)\n", msg, packet)
// 			msgs = append(msgs, msg)
// 		}
// 	}
// 	return msgs, nil
// }

// func readUntilMarker(reader io.Reader, marker []byte) ([]byte, error) {

// 	data := make([]byte, 0, 4096)
// 	buf := make([]byte, 2048)
// 	done := false

// 	for !done {
// 		nRead, err := reader.Read(buf)
// 		if err != nil {
// 			return nil, err
// 		}
// 		if nRead == 0 {
// 			return nil, fmt.Errorf("Unexpected end of input")
// 		}
// 		data = append(data, buf[:nRead]...)

// 		// done when <marker bytes> are the last bytes of the transmission
// 		potentialMarker := data[len(data)-len(marker):]
// 		done = bytes.Compare(marker, potentialMarker) == 0
// 	}

// 	return data, nil
// }

// func msgDecode(msgBytes []byte) (ServerMessage, error) {
// 	if len(msgBytes) < 5 {
// 		return ServerMessage{}, fmt.Errorf("Got %d bytes, need at least 5", len(msgBytes))
// 	}

// 	dataStart := 3
// 	dataEnd := len(msgBytes) - 2
// 	codeBytes := msgBytes[:dataStart]
// 	data := msgBytes[dataStart:dataEnd]
// 	expectedChecksum := string(msgBytes[dataEnd:])
// 	actualChecksum := msgChecksum(msgBytes[:dataEnd])
// 	if strings.ToLower(expectedChecksum) != strings.ToLower(actualChecksum) {
// 		return ServerMessage{}, fmt.Errorf("failed to decode message %v: data %v, expected checksum %v, actual %v",
// 			msgBytes, data, expectedChecksum, actualChecksum)
// 	}

// 	codeInt, err := msgCodeDecode(codeBytes)
// 	if err != nil {
// 		return ServerMessage{}, err
// 	}

// 	msg := ServerMessage{
// 		Code: ServerCode(codeInt),
// 		Data: data,
// 	}

// 	return msg, nil
// }

// func msgCodeDecode(codeBytes []byte) (int, error) {
// 	codeInt, err := strconv.Atoi(string(codeBytes))
// 	if err != nil {
// 		return -1, fmt.Errorf("invalid code bytes %s", codeBytes)
// 	}
// 	return codeInt, nil
// }

// func msgChecksum(bytes []byte) string {
// 	var sum int
// 	for _, b := range bytes {
// 		sum += int(b)
// 	}

// 	sum = sum & 0xff
// 	checksum := fmt.Sprintf("%02X", sum)
// 	return checksum
// }
