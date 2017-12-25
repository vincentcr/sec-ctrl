package db

import (
	"database/sql"
	"fmt"
	"sec-ctl/cloud/config"
	"testing"
	"time"

	"github.com/vincentcr/testify/assert"
)

var db *DB

func init() {
	cfg, err := config.LoadTest()
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

	u, err := db.CreateUser("joe@gmail.com", "pass")

	assert.Nil(t, err)
	assert.Equal(t, "joe@gmail.com", u.Email)
	assertUUID(t, u.ID)

	var n int
	err = db.conn.QueryRowx(
		`SELECT COUNT(*) FROM users WHERE id = $1 AND email = $2 AND PASSWORD != $3`,
		u.ID, u.Email, "pass",
	).Scan(&n)
	if err != nil {
		t.Fatalf("error verifying row count: %v", err)
	}

	assert.Equal(t, 1, n)

}

func TestAuthUserByPasswordGoodPassword(t *testing.T) {
	mustWipeDB()

	u, err := db.CreateUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	u2, err := db.CreateUser("joe2@gmail.com", "pass")
	assert.Nil(t, err)

	u3, err := db.AuthUserByPassword("joe@gmail.com", "pass")
	assert.Nil(t, err)

	assert.Equal(t, u, u3)

	u4, err := db.AuthUserByPassword("joe2@gmail.com", "pass")
	assert.Nil(t, err)

	assert.Equal(t, u2, u4)
}

func TestAuthUserByPasswordBadPassword(t *testing.T) {
	mustWipeDB()

	_, err := db.CreateUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	u2, err := db.AuthUserByPassword("joe@gmail.com", "ssap")
	assert.Equal(t, sql.ErrNoRows, err)

	assert.Empty(t, u2.ID)
	assert.Empty(t, u2.Email)
}

func TestAuthUserByPasswordBadEmail(t *testing.T) {
	mustWipeDB()

	_, err := db.CreateUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	u2, err := db.AuthUserByPassword("joe2@gmail.com", "pass")
	assert.Equal(t, sql.ErrNoRows, err)
	assert.Empty(t, u2.ID)
	assert.Empty(t, u2.Email)
}

func TestCreateUserToken(t *testing.T) {
	mustWipeDB()

	u, err := db.CreateUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	tok, err := db.CreateUserToken(u.ID)
	assert.Nil(t, err)

	assertUUID(t, tok)

	var n int
	err = db.conn.QueryRowx(
		`SELECT COUNT(*) FROM auth_tokens WHERE token = $1 AND rec_id = $2 AND expires_at IS NULL`,
		tok, u.ID,
	).Scan(&n)
	if err != nil {
		t.Fatalf("error verifying row count: %v", err)
	}

	assert.Equal(t, 1, n)
}

func TestAuthUserByToken(t *testing.T) {
	mustWipeDB()

	u, err := db.CreateUser("joe@gmail.com", "pass")
	assert.Nil(t, err)

	tok, err := db.CreateUserToken(u.ID)
	assert.Nil(t, err)

	u2, err := db.AuthUserByToken(tok)
	assert.Nil(t, err)

	assert.Equal(t, u, u2)
}

func TestCreateSite(t *testing.T) {
	mustWipeDB()

	s, err := db.CreateSite()
	assert.Nil(t, err)

	assertUUID(t, s.ID)
	assert.Empty(t, s.OwnerID)
	assert.Empty(t, s.StateShadow)

	var n int
	err = db.conn.QueryRowx(
		`SELECT COUNT(*) FROM sites WHERE id = $1`,
		s.ID,
	).Scan(&n)
	if err != nil {
		t.Fatalf("error verifying row count: %v", err)
	}

	assert.Equal(t, 1, n)
}

func TestFetchSiteByID(t *testing.T) {
	mustWipeDB()

	s1, err := db.CreateSite()
	assert.Nil(t, err)
	assertUUID(t, s1.ID)

	s2, err := db.FetchSiteByID(s1.ID)
	assert.Nil(t, err)
	assertUUID(t, s2.ID)

	assert.Equal(t, s1, s2)
}

func TestCreateSiteToken(t *testing.T) {
	mustWipeDB()

	s, err := db.CreateSite()
	assert.Nil(t, err)

	tok, err := db.CreateSiteToken(s.ID)
	assert.Nil(t, err)

	assertUUID(t, tok)

	var n int
	err = db.conn.QueryRowx(
		`SELECT COUNT(*) FROM auth_tokens WHERE token = $1 AND rec_id = $2 AND expires_at IS NULL`,
		tok, s.ID,
	).Scan(&n)
	if err != nil {
		t.Fatalf("error verifying row count: %v", err)
	}

	assert.Equal(t, 1, n)
}

func TestCreateSiteTokenWithExpiry(t *testing.T) {
	mustWipeDB()

	s, err := db.CreateSite()
	assert.Nil(t, err)

	expiry := time.Now().Add(time.Hour * 4)

	tok, err := db.CreateSiteTokenWithExpiry(s.ID, expiry)
	assert.Nil(t, err)

	assertUUID(t, tok)

	var n int
	err = db.conn.QueryRowx(
		`SELECT COUNT(*) FROM auth_tokens WHERE token = $1 AND rec_id = $2 AND expires_at = $3`,
		tok, s.ID, expiry,
	).Scan(&n)
	if err != nil {
		t.Fatalf("error verifying row count: %v", err)
	}

	assert.Equal(t, 1, n)
}

func TestAuthSiteByToken(t *testing.T) {
	mustWipeDB()

	s1, err := db.CreateSite()
	assert.Nil(t, err)

	s2, err := db.CreateSite()
	assert.Nil(t, err)

	tok, err := db.CreateSiteToken(s1.ID)
	assert.Nil(t, err)

	tok2, err := db.CreateSiteToken(s2.ID)
	assert.Nil(t, err)

	s3, err := db.AuthSiteByToken(tok)
	assert.Nil(t, err)

	assert.Equal(t, s1, s3)

	s4, err := db.AuthSiteByToken(tok2)
	assert.Nil(t, err)

	assert.Equal(t, s2, s4)
}

func TestClaimSite(t *testing.T) {
	mustWipeDB()

	s1, err := db.CreateSite()
	assert.Nil(t, err)

	s2, err := db.CreateSite()
	assert.Nil(t, err)

	u1, err := db.CreateUser("foo@bar.com", "abcdef")
	assert.Nil(t, err)

	tok, err := db.CreateSiteToken(s1.ID)
	assert.Nil(t, err)

	err = db.ClaimSite(u1, s1.ID, tok)
	assert.Nil(t, err)

	s1b, err := db.FetchSiteByID(s1.ID)
	assert.Nil(t, err)
	assert.Equal(t, s1b.OwnerID, u1.ID)

	s2b, err := db.FetchSiteByID(s2.ID)
	assert.Nil(t, err)
	assert.Nil(t, s2b.OwnerID)
}

func TestClaimSiteOnlyOnce(t *testing.T) {
	mustWipeDB()

	s1, err := db.CreateSite()
	assert.Nil(t, err)

	u1, err := db.CreateUser("foo@bar.com", "abcdef")
	assert.Nil(t, err)

	tok, err := db.CreateSiteToken(s1.ID)
	assert.Nil(t, err)

	tok2, err := db.CreateSiteToken(s1.ID)
	assert.Nil(t, err)

	err = db.ClaimSite(u1, s1.ID, tok)
	assert.Nil(t, err)

	err = db.ClaimSite(u1, s1.ID, tok2)
	assert.Error(t, err)
}

func TestClaimSiteInvalidToken(t *testing.T) {
	mustWipeDB()

	s1, err := db.CreateSite()
	assert.Nil(t, err)

	u1, err := db.CreateUser("foo@bar.com", "abcdef")
	assert.Nil(t, err)

	s2, err := db.CreateSite()
	assert.Nil(t, err)

	_, err = db.CreateSiteToken(s1.ID)
	assert.Nil(t, err)

	tok2, err := db.CreateSiteToken(s2.ID)
	assert.Nil(t, err)

	err = db.ClaimSite(u1, s1.ID, tok2)
	assert.Error(t, err)
}

func TestCreateEvent(t *testing.T) {
	mustWipeDB()

	s1, err := db.CreateSite()
	assert.Nil(t, err)

	assertEvt := func(time time.Time, level string, data interface{}, actual SiteEvent) {
		assert.True(t, actual.ID > 0)
		assert.InEpsilon(t, time.UTC().UnixNano(), actual.Time.UnixNano(), 500)
		assert.Equal(t, level, actual.Level)
		d1, err := actual.DecodeData()
		assert.Nil(t, err)
		assert.Equal(t, data, d1)

		var actualB SiteEvent
		err = db.conn.Get(&actualB, "SELECT * FROM site_events WHERE id = $1", actual.ID)
		assert.Nil(t, err)
		assert.Equal(t, actual, actualB)
	}

	t1 := time.Now()
	time.Sleep(time.Millisecond * 2)
	e1, err := db.CreateEvent(s1.ID, t1, "warn", "something")
	assert.Nil(t, err)
	assertEvt(t1, "warn", "something", e1)

	time.Sleep(time.Millisecond * 2)
	t2 := time.Now()
	time.Sleep(time.Millisecond * 2)
	e2, err := db.CreateEvent(s1.ID, t2, "error", map[string]int{"something": 1})
	assert.Nil(t, err)
	assert.NotEqual(t, e1.ID, e2.ID)
	assertEvt(t1, "error", map[string]interface{}{"something": 1.0}, e2)
}

func TestGetEvents(t *testing.T) {
	s1, err := db.CreateSite()
	if !assert.Nil(t, err) {
		t.FailNow()
	}

	s2, err := db.CreateSite()
	if !assert.Nil(t, err) {
		t.FailNow()
	}

	n := 20

	evts1 := make([]SiteEvent, n)
	evts2 := make([]SiteEvent, n)

	for i := n - 1; i >= 0; i-- {
		evt1, err := db.CreateEvent(s1.ID, time.Now(), "warn", map[string]int{"i": i})
		if !assert.Nil(t, err) {
			t.FailNow()
		}
		evt2, err := db.CreateEvent(s2.ID, time.Now(), "info", map[string]int{"i": i})
		if !assert.Nil(t, err) {
			t.FailNow()
		}

		evts1[i] = evt1
		evts2[i] = evt2
	}

	var pageSize uint = 9

	evts, err := db.GetSiteEvents(s1.ID, 0, pageSize)
	assert.Nil(t, err)
	assert.Equal(t, evts1[0:pageSize], evts)

	offsetID := evts[len(evts)-1].ID
	evts, err = db.GetSiteEvents(s1.ID, offsetID, pageSize)
	assert.Nil(t, err)
	assert.Equal(t, evts1[pageSize:pageSize*2], evts)

	offsetID = evts[len(evts)-1].ID
	evts, err = db.GetSiteEvents(s1.ID, offsetID, pageSize)
	assert.Nil(t, err)
	assert.Equal(t, evts1[pageSize*2:], evts)
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
		TRUNCATE site_events CASCADE;
	`)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func assertUUID(t *testing.T, v interface{}) {
	t.Helper()

	var s string
	switch tv := v.(type) {
	case string:
		s = tv
	case fmt.Stringer:
		s = tv.String()
	default:
		t.Fatalf("don't know how to stringify %#v", v)
	}

	assert.Regexp(t, "^[a-z0-9]{32}$", s)
}

// func TestPerfUuid(t *testing.T) {

// 	n := 10000

// 	timeTrack := func(label string, work func()) {
// 		start := time.Now()
// 		for i := 0; i < n; i++ {
// 			work()
// 		}
// 		elapsed := time.Duration(int64(time.Since(start)) / int64(n))
// 		fmt.Printf("%v: %v\n", label, elapsed)
// 	}

// 	timeTrack("gen_random_uuid", func() {
// 		db.conn.Exec("SELECT gen_random_uuid()")
// 	})

// 	timeTrack("gen_random_bytes", func() {
// 		db.conn.Exec("SELECT encode(gen_random_bytes(16), 'hex');")
// 	})

// 	timeTrack("uuid_generate_v4", func() {
// 		db.conn.Exec("SELECT uuid_generate_v4()")
// 	})

// 	timeTrack("uuid_generate_v1", func() {
// 		db.conn.Exec("SELECT uuid_generate_v1()")
// 	})

// 	t.Fail()
// }
