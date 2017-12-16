package tpi

import (
	"bytes"
	"fmt"
	"math/rand"
	"sync"
	"testing"
	"time"

	"github.com/vincentcr/testify/assert"
)

type messageTestCase struct {
	encoded []byte
	code    int
	data    []byte
}

func init() {
	rand.Seed(time.Now().UTC().UnixNano())

}

func TestWrite(t *testing.T) {

	for _, tc := range mkMessageTestCases() {

		w := new(bytes.Buffer)
		m := baseMessage{tc.code, tc.data}
		err := m.write(w)
		assert.Nil(t, err)

		actual := w.Bytes()
		expected := append(tc.encoded, crlf...)
		assert.Equal(t, expected, actual)
	}

}

func TestEncode(t *testing.T) {
	for _, tc := range mkMessageTestCases() {
		m := baseMessage{tc.code, tc.data}
		actual := m.encode()
		assert.Equal(t, tc.encoded, actual)
	}
}

func TestReadAvailableMessages0(t *testing.T) {

	r := newMockReader()

	r.addData(crlf)

	msgs, err := readAvailableMessages(r)

	assert.Nil(t, err)
	assert.NotNil(t, msgs)
	assert.Empty(t, msgs)
}

func TestReadAvailableMessages1(t *testing.T) {
	for _, tc := range mkMessageTestCases() {

		r := newMockReader()
		r.addData(tc.encoded)
		r.addData(crlf)

		msgs, err := readAvailableMessages(r)
		assert.Nil(t, err)
		assertMessages(t, []messageTestCase{tc}, msgs)
	}
}

func TestReadAvailableMessages2(t *testing.T) {
	for _, tc1 := range mkMessageTestCases() {
		for _, tc2 := range mkMessageTestCases() {

			r := newMockReader()
			r.addData(tc1.encoded)
			r.addData(crlf)
			r.addData(tc2.encoded)
			r.addData(crlf)

			msgs, err := readAvailableMessages(r)

			assert.Nil(t, err)
			assertMessages(t, []messageTestCase{tc1, tc2}, msgs)
		}
	}
}

func TestReadAvailableMessagesn(t *testing.T) {

	tcs := mkMessageTestCases()
	r := newMockReader()

	for _, tc := range tcs {
		r.addData(tc.encoded)
		r.addData(crlf)
	}

	msgs, err := readAvailableMessages(r)

	assert.Nil(t, err)
	assertMessages(t, tcs, msgs)
}

func TestReadAvailableMessagesChunks(t *testing.T) {
	tcs := mkMessageTestCases()[0:1]
	r := newMockReader()

	go func() {

		tc := tcs[0]

		n1 := 1 + len(tc.encoded)/3
		n2 := n1 * 2

		chunks := [][]byte{
			tc.encoded[0:n1],
			tc.encoded[n1:n2],
			tc.encoded[n2:],
			crlf,
		}

		for _, c := range chunks {
			time.Sleep(time.Millisecond * 10)
			r.addData(c)
		}
	}()

	msgs, err := readAvailableMessages(r)
	assert.Nil(t, err)
	assertMessages(t, tcs, msgs)

}

func TestReadAvailableMessagesRandomChunking(t *testing.T) {

	for i := 0; i < 32; i++ {

		r := newMockReader()

		tcs := mkRandomTestCases(16)

		go func() {
			enc := make([]byte, 0)
			for _, tc := range tcs {
				enc = append(enc, tc.encoded...)
				enc = append(enc, crlf...)
			}

			for soff := 0; soff < len(enc); {
				eoff := soff + rand.Intn(len(enc)-soff) + 1
				buf := enc[soff:eoff]
				r.addData(buf)
				soff = eoff

				if rand.Float32() >= 0.5 {
					delay := time.Duration(5+5*rand.Float32()) * time.Millisecond
					time.Sleep(delay)
				}
			}
		}()

		msgs := make([]baseMessage, 0, len(tcs))
		for len(msgs) < len(tcs) {
			newMsgs, err := readAvailableMessages(r)
			if !assert.Nil(t, err) {
				return
			}
			msgs = append(msgs, newMsgs...)
		}

		assertMessages(t, tcs, msgs)
	}
}

func assertMessages(t *testing.T, tcs []messageTestCase, as []baseMessage, fmtAndArgs ...interface{}) {
	t.Helper()
	if !assert.Equal(t, len(tcs), len(as), fmtAndArgs...) {
		return
	}

	for i, tc := range tcs {

		e := baseMessage{Code: tc.code, Data: tc.data}

		if tc.data == nil {
			e.Data = []byte{}
		}

		a := as[i]

		msg := ""
		if len(fmtAndArgs) >= 1 {
			msg = fmt.Sprintf(fmtAndArgs[0].(string), fmtAndArgs[1:]...)
			msg += ": "
		}

		msg += fmt.Sprintf("failed at index %d", i)

		assert.Equal(t, e, a, msg)
	}

}

type mockReader struct {
	chunk  []byte
	waiter *sync.Cond
}

func newMockReader() *mockReader {
	r := &mockReader{
		waiter: sync.NewCond(&sync.Mutex{}),
	}

	return r
}

func (r *mockReader) addData(b []byte) {
	r.waiter.L.Lock()
	defer r.waiter.L.Unlock()
	r.chunk = append(r.chunk, b...)
	r.waiter.Signal()
}

func (r *mockReader) Read(p []byte) (int, error) {
	r.waiter.L.Lock()
	defer r.waiter.L.Unlock()
	for len(r.chunk) == 0 {
		r.waiter.Wait()
	}

	n := copy(p, r.chunk)

	if n <= len(r.chunk) {
		r.chunk = r.chunk[n:]
	}

	return n, nil
}

func mkRandomTestCases(maxMsgs int) []messageTestCase {
	tcs := make([]messageTestCase, rand.Intn(maxMsgs))
	for i := 0; i < len(tcs); i++ {
		data := make([]byte, rand.Intn(42))
		for j := 0; j < len(data); j++ {
			data[j] = byte(rand.Int())
		}
		m := baseMessage{Code: rand.Intn(1000), Data: data}
		tc := messageTestCase{m.encode(), m.Code, m.Data}
		tcs[i] = tc
	}

	return tcs
}

func mkMessageTestCases() []messageTestCase {
	return []messageTestCase{
		messageTestCase{[]byte("012helloA7"), 12, []byte("hello")},
		messageTestCase{[]byte("123hello worldF2"), 123, []byte("hello world")},
		messageTestCase{[]byte("000hF8"), 0, []byte("h")},
		messageTestCase{[]byte("00191"), 1, []byte("")},
		messageTestCase{[]byte("00191"), 1, nil},
		messageTestCase{[]byte("999AB"), 999, nil},
	}
}
func TestDecodeIntCode(t *testing.T) {

	type testCase struct {
		expected int
		actual   string
	}

	testCases := []testCase{
		testCase{0, "000"},
		testCase{6, "006"},
		testCase{10, "010"},
		testCase{67, "067"},
		testCase{100, "100"},
		testCase{123, "123"},
		testCase{256, "256"},
		testCase{999, "999"},
	}

	for _, tc := range testCases {
		actual, err := DecodeIntCode([]byte(tc.actual))
		assert.Nil(t, err)
		assert.Equal(t, tc.expected, actual)
	}
}

func TestEncodeIntCode(t *testing.T) {

	type testCase struct {
		expected string
		actual   int
	}

	testCases := []testCase{
		testCase{"000", 0},
		testCase{"006", 6},
		testCase{"010", 10},
		testCase{"067", 67},
		testCase{"100", 100},
		testCase{"123", 123},
		testCase{"256", 256},
		testCase{"999", 999},
	}

	for _, tc := range testCases {
		assert.Equal(t, []byte(tc.expected), EncodeIntCode(tc.actual))
	}
}
