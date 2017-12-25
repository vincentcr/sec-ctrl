package db

import (
	"fmt"
	"strings"
)

// UUID represents a nullable PostgreSQL uuid
type UUID []byte

func (u UUID) String() string {
	return string(u)
}

//Equals returns whether the supplied uuid is equal
func (u UUID) Equals(u2 UUID) bool {

	if u2 == nil {
		return false
	}

	n := len(u)

	if n != len(u2) {
		return false
	}

	for i := 0; i < n; i++ {
		if u[i] != u2[i] {
			return false
		}
	}

	return true
}

// GoString returns a go representation of the uuid
func (u UUID) GoString() string {
	return fmt.Sprintf("UUID[%v]", u)
}

// Scan implements the Scanner interface.
func (u *UUID) Scan(value interface{}) error {

	if value == nil {
		*u = nil
	} else {
		var s string
		switch v := value.(type) {
		case string:
			s = v
		case []byte:
			s = string(v)
		}

		*u = UUID(strings.Replace(s, "-", "", -1))
	}

	return nil
}
