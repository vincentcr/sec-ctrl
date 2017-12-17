package ws

import (
	"encoding/gob"
	"fmt"
	"log"
	"net/http"

	"sec-ctl/pkg/sites"

	"github.com/gorilla/websocket"
)

func init() {
	gob.Register(ControlMessage{})
	gob.Register(sites.UserCommand{})
	gob.Register(sites.Event{})
	gob.Register(sites.Partition{})
	gob.Register(sites.Zone{})
	gob.Register(sites.StateChange{})
	gob.Register(sites.SystemState{})
	gob.Register(sites.SystemTroubleStatus(0))
	gob.Register(sites.Alarm{})
}

// Conn is a wrapper type of the websocket connection
type Conn struct {
	ws *websocket.Conn
}

// Dial opens a connection to the specified server, using the specified auth token
func Dial(url string, token string) (*Conn, error) {
	var dialer *websocket.Dialer
	authVal := fmt.Sprintf("Bearer %v", token)
	authHead := http.Header{"authorization": []string{authVal}}

	ws, _, err := dialer.Dial(url, authHead)
	if err != nil {
		return nil, err
	}

	return &Conn{ws: ws}, nil
}

// UpgradeRequest upgrades an http request connection to a websocket connection
func UpgradeRequest(w http.ResponseWriter, r *http.Request) (*Conn, error) {
	var wsupgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	ws, err := wsupgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil, err
	}

	return &Conn{ws: ws}, nil
}

// ControlMessage is the type used for sending control messages
type ControlMessage struct {
	Code ControlMessageCode
}

// ControlMessageCode is the code type for control messages
type ControlMessageCode byte

const (
	// CtrlGetState indicates a request to get the latest state from the client
	CtrlGetState ControlMessageCode = 1
)

// Write encodes the supplied data object and sends it through the websocket
func (conn *Conn) Write(data interface{}) error {
	w, err := conn.ws.NextWriter(websocket.BinaryMessage)
	if err != nil {
		return err
	}
	enc := gob.NewEncoder(w)
	if err = enc.Encode(&data); err != nil {
		return err
	}

	log.Println("wrote message:", data)

	return w.Close()
}

// Reads receives messages from the websocket and decodes them.
func (conn *Conn) Read() (interface{}, error) {

	_, r, err := conn.ws.NextReader()
	if err != nil {
		return nil, err
	}

	dec := gob.NewDecoder(r)

	var res interface{}
	if err = dec.Decode(&res); err != nil {
		return nil, err
	}

	log.Println("read message:", res)

	return res, nil
}

// Close closes the connection
func (conn *Conn) Close() error {
	return conn.ws.Close()
}
