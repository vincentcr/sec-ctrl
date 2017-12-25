package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sec-ctl/cloud/config"
	"time"

	"github.com/jmoiron/sqlx"
	// load postgres driver
	_ "github.com/lib/pq"
)

const bcryptSaltSize = 8

// DB represents a database connection
type DB struct {
	conn *sqlx.DB
}

// User represents a user row
type User struct {
	ID    UUID
	Email string
}

// Site represents a site row
type Site struct {
	ID          UUID
	OwnerID     UUID           `db:"owner_id"`
	StateShadow sql.NullString `db:"state_shadow"`
}

// SiteEvent represents a site event row
type SiteEvent struct {
	ID     int64
	SiteID UUID `db:"site_id"`
	Level  string
	Time   time.Time
	Data   string
}

func (e SiteEvent) DecodeData() (interface{}, error) {
	var d interface{}
	err := json.Unmarshal([]byte(e.Data), &d)
	if err != nil {
		return nil, err
	}

	return d, nil
}

// OpenDB opens a database connection
func OpenDB(cfg config.Config) (*DB, error) {
	connStr := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort,
		cfg.DBUsername, cfg.DBPassword,
		cfg.DBName,
	)
	conn, err := sqlx.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("Failed to connect to db: %v", err)
	}

	if _, err = conn.Exec("SELECT 1;"); err != nil {
		return nil, fmt.Errorf("unable to communicate with db: %v", err)
	}

	db := &DB{conn: conn}

	return db, nil
}

// CreateUser creates a user with supplied email and password
func (db *DB) CreateUser(email string, password string) (User, error) {

	u := User{
		Email: email,
	}

	tx, err := db.conn.Beginx()
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback()

	r := tx.QueryRow(`
		INSERT
			INTO users(email, password)
			VALUES ($1, crypt($2, gen_salt('bf', $3)))
			RETURNING id
	`, email, password, bcryptSaltSize)
	err = r.Scan(&u.ID)
	if err != nil {
		return User{}, err
	}

	if err = tx.Commit(); err != nil {
		return User{}, err
	}

	return u, nil
}

// CreateUserToken creates a token for specified user id
func (db *DB) CreateUserToken(userID UUID) (string, error) {
	tx, err := db.conn.Beginx()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	tok, err := createAuthToken(tx, userID, time.Time{})
	if err != nil {
		return "", err
	}

	if err = tx.Commit(); err != nil {
		return "", err
	}

	return tok, nil
}

// AuthUserByPassword returns a user record if the password is correct
func (db *DB) AuthUserByPassword(email string, password string) (User, error) {

	var u User
	err := db.conn.Get(&u, "SELECT id, email FROM users where email = $1 AND password = crypt($2, password)", email, password)
	if err != nil {
		return User{}, err
	}

	return u, nil
}

// AuthUserByToken returns a user record if the token is valid
func (db *DB) AuthUserByToken(token string) (User, error) {
	var u User
	err := db.conn.Get(&u, `
			SELECT users.id, users.email
				FROM users
					JOIN auth_tokens ON validate_auth_token(auth_tokens, users.id, $1)
		`, token)

	if err != nil {
		return User{}, err
	}

	return u, nil
}

// CreateSite creates a site
func (db *DB) CreateSite() (Site, error) {

	tx, err := db.conn.Beginx()
	if err != nil {
		return Site{}, err
	}
	defer tx.Rollback()

	s := Site{}

	err = tx.QueryRow(`
		INSERT
			INTO sites DEFAULT VALUES
			RETURNING id
	`).Scan(&s.ID)

	if err != nil {
		return Site{}, err
	}

	if err = tx.Commit(); err != nil {
		return Site{}, err
	}

	return s, nil
}

// CreateSiteToken creates a token for the specified site id. the token doesn't expire
func (db *DB) CreateSiteToken(siteID UUID) (string, error) {
	return db.CreateSiteTokenWithExpiry(siteID, time.Time{})
}

// CreateSiteTokenWithExpiry creates a token for the specified site id with the specifed expiry
func (db *DB) CreateSiteTokenWithExpiry(siteID UUID, expiry time.Time) (string, error) {
	tx, err := db.conn.Beginx()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	tok, err := createAuthToken(tx, siteID, expiry)
	if err != nil {
		return "", err
	}

	if err = tx.Commit(); err != nil {
		return "", err
	}

	return tok, nil
}

// FetchSiteByID fetches the site with the specified id
func (db *DB) FetchSiteByID(siteID UUID) (Site, error) {
	var s Site
	err := db.conn.Get(&s, `SELECT * FROM sites WHERE id = $1`, siteID)
	return s, err
}

// AuthSiteByToken returns the site whose token matches the specified value.
func (db *DB) AuthSiteByToken(token string) (Site, error) {
	var s Site
	err := db.conn.Get(&s, `
			SELECT sites.*
				FROM sites
					JOIN auth_tokens ON validate_auth_token(auth_tokens, sites.id, $1)
		`, token)

	if err != nil {
		return Site{}, err
	}

	return s, nil
}

// ClaimSite sets the site's owner to the supplied user id.
// The operation only succeeds if the site is not already owned
// and the supplied claim token is valid.
func (db *DB) ClaimSite(user User, siteID UUID, claimToken string) error {
	tx, err := db.conn.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	r, err := tx.Exec(`
		UPDATE sites
			SET owner_id = $1
			FROM auth_tokens
			WHERE sites.id = $2
				AND owner_id IS NULL
				AND validate_auth_token(auth_tokens, sites.id, $3)
	`, user.ID, siteID, claimToken)
	if err != nil {
		return err
	}

	n, err := r.RowsAffected()
	if err != nil {
		return err
	}

	if n == 0 {
		return fmt.Errorf("Invalid Site id, invalid claim token, or already claimed")
	}

	_, err = tx.Exec(`DELETE FROM auth_tokens WHERE token = $1`, claimToken)
	if err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return err
}

// CreateEvent creates an event with the specified data
func (db *DB) CreateEvent(siteID UUID, tstamp time.Time, level string, evt interface{}) (SiteEvent, error) {

	data, err := json.Marshal(evt)
	if err != nil {
		panic(fmt.Errorf("failed to jsonify event %v: %v", evt, err))
	}

	var e SiteEvent
	err = db.conn.Get(&e, `
		INSERT INTO site_events(level, time, site_id, data)
		VALUES ($1, $2, $3, $4)
		RETURNING *
	`, level, tstamp.UTC(), siteID, data)

	return e, err
}

// GetSiteEvents returns the last site events by time
func (db *DB) GetSiteEvents(siteID UUID, offsetID int64, max uint) ([]SiteEvent, error) {

	stmt := `
	SELECT * FROM site_events
		WHERE site_id = $1 AND ($2 = 0 OR id < $2)
		ORDER BY id DESC
	`
	args := []interface{}{siteID, offsetID}

	if max > 0 {
		stmt += " LIMIT $3"
		args = append(args, max)
	}

	var evts []SiteEvent
	err := db.conn.Select(&evts, stmt, args...)
	if err != nil {
		return nil, err
	}

	return evts, nil
}

func createAuthToken(tx *sqlx.Tx, recID UUID, expiresAt time.Time) (string, error) {

	var expiresAtOrNull interface{}
	if expiresAt.IsZero() {
		expiresAtOrNull = nil
	} else {
		expiresAtOrNull = expiresAt
	}

	var tok string
	r := tx.QueryRow(`
		INSERT INTO
			auth_tokens(rec_id, expires_at)
			VALUES ($1, $2)
			RETURNING token
	`, recID, expiresAtOrNull)

	err := r.Scan(&tok)
	if err != nil {
		return "", err
	}

	return tok, nil
}
