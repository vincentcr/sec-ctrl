package ws

import (
	"net"
	"net/http"
	"sec-ctl/pkg/sites"
	"testing"

	"github.com/vincentcr/testify/assert"
)

func TestDialUpgrade(t *testing.T) {
	assertConnections(t, nil, nil)
}

func TestReadWrite(t *testing.T) {

	msgs := []interface{}{
		ControlMessage{CtrlGetState},
		sites.UserCommand{Code: sites.CmdArmAway},
		sites.Event{Level: sites.LevelAlarm, Code: "Foo"},
		sites.Partition{ID: "boo", State: sites.PartitionStateArmed},
		sites.Zone{ID: "bar", State: sites.ZoneStateAlarmRestore},
		sites.SystemTroubleStatusACPowerLost,
		sites.StateChange{Type: sites.StateChangePartition, Data: sites.Partition{ID: "boo", State: sites.PartitionStateArmed}},
		sites.SystemState{TroubleStatus: sites.SystemTroubleStatus(0), Zones: []sites.Zone{sites.Zone{ID: "bar", State: sites.ZoneStateAlarmRestore}}},
	}

	writeExpectedMsgs := func(conn *Conn) {
		for _, msg := range msgs {
			conn.Write(msg)
		}
	}

	readExpectedMsgs := func(conn *Conn) {
		for i := 0; i < len(msgs); i++ {
			msg, err := conn.Read()
			assert.Nil(t, err)
			assert.Equal(t, msgs[i], msg)
		}
	}

	clientH := func(conn *Conn) {
		writeExpectedMsgs(conn)
		readExpectedMsgs(conn)
	}

	srvH := func(conn *Conn) {
		readExpectedMsgs(conn)
		writeExpectedMsgs(conn)
	}

	assertConnections(t, srvH, clientH)
}

func assertConnections(t *testing.T, srvH, clientH connHandler) {

	path := "/hello"
	token := "world"

	h := func(w http.ResponseWriter, r *http.Request) {

		auth := r.Header.Get("authorization")
		assert.Equal(t, "Bearer "+token, auth)

		assert.Equal(t, path, r.URL.Path)

		sconn, err := UpgradeRequest(w, r)
		assert.Nil(t, err)
		assert.NotNil(t, sconn)

		if srvH != nil {
			srvH(sconn)
		}
	}

	srv, err := newMockWSServer(h)
	if err != nil {
		t.Fatal("failed to create server", err)
	}
	defer srv.Close()

	url := "ws://" + srv.addr + path
	conn, err := Dial(url, token)
	if err != nil {
		t.Fatal("dial err:", err)
	}

	assert.NotNil(t, conn)

	if clientH != nil {
		clientH(conn)
	}
}

type connHandler func(conn *Conn)

type mockWSServer struct {
	addr string
	*http.Server
}

func newMockWSServer(h http.HandlerFunc) (*mockWSServer, error) {
	addr := ":0"
	srv := http.Server{
		Addr:    addr,
		Handler: h,
	}
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := srv.Serve(ln); err != http.ErrServerClosed {
			panic(err)
		}
	}()

	return &mockWSServer{ln.Addr().String(), &srv}, nil
}
