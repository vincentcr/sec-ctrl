package db

import (
	"database/sql"
	"sec-ctl/cloud/config"
	"testing"

	"github.com/vincentcr/testify/assert"
)

var db *DB

func init() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	db, err = OpenDB(cfg)
	if err != nil {
		panic(err)
	}
}

func TestCreateUser(t *testing.T) {
	mustWipeDB()

	u, tok, err := db.CreateUser("joe@gmail.com", "pass")

	assert.Nil(t, err)
	assert.Equal(t, "joe@gmail.com", u.Email)
	assert.Regexp(t, "^[a-z0-9]{32}$", u.ID)
	assert.Regexp(t, "^[a-z0-9]{32}$", tok)

	var n int
	err = db.conn.QueryRowx(
		`SELECT COUNT(*) FROM users WHERE id = $1 AND email = $2 AND PASSWORD != $3`,
		u.ID, u.Email, "pass",
	).Scan(&n)
	if err != nil {
		t.Fatalf("error verifying row count: %v", err)
	}

	assert.Equal(t, 1, n)

	err = db.conn.QueryRowx(
		`SELECT COUNT(*) FROM auth_tokens WHERE token = $1 AND rec_id = $2 AND expires_at IS NULL`,
		tok, u.ID,
	).Scan(&n)
	if err != nil {
		t.Fatalf("error verifying row count: %v", err)
	}

	assert.Equal(t, 1, n)
}

func TestAuthUserGoodPassword(t *testing.T) {
	mustWipeDB()

	u, _, err := db.CreateUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	u2, err := db.AuthUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	assert.Equal(t, u, u2)
}

func TestAuthUserBadPassword(t *testing.T) {
	mustWipeDB()

	_, _, err := db.CreateUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	u2, err := db.AuthUser("joe@gmail.com", "ssap")
	assert.Equal(t, sql.ErrNoRows, err)

	assert.Empty(t, u2.ID)
	assert.Empty(t, u2.Email)
}

func TestAuthUserBadEmail(t *testing.T) {
	mustWipeDB()

	_, _, err := db.CreateUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	u2, err := db.AuthUser("joe2@gmail.com", "ssap")
	assert.Equal(t, sql.ErrNoRows, err)
	assert.Empty(t, u2.ID)
	assert.Empty(t, u2.Email)
}

func mustWipeDB() {
	if err := wipeDB(); err != nil {
		panic(err)
	}
}

func wipeDB() error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	_, err = tx.Exec(`
		TRUNCATE users CASCADE;
		TRUNCATE sites CASCADE;
		TRUNCATE auth_tokens CASCADE;
		TRUNCATE events CASCADE;
	`)
	if err != nil {
		return err
	}
	return tx.Commit()
}
