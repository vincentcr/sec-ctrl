BEGIN;

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

DROP TABLE IF EXISTS auth_tokens CASCADE;
CREATE TABLE auth_tokens(
  token TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  rec_id uuid NOT NULL,
  expires_at TIMESTAMP
);

DROP TABLE IF EXISTS sites CASCADE;
CREATE TABLE sites(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  state_shadow JSONB
);

DROP TABLE IF EXISTS site_partitions CASCADE;
CREATE TABLE site_partitions(
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  id TEXT,
  state TEXT,
	trouble_state_led BOOLEAN,
	keypadled_flash_state SMALLINT,
	keypadled_state SMALLINT,
  PRIMARY KEY (site_id, id)
);

DROP TABLE IF EXISTS site_zones CASCADE;
CREATE TABLE site_zones(
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  id TEXT NOT NULL,
  state TEXT,
  PRIMARY KEY (site_id, id)
);

DROP TABLE IF EXISTS site_events CASCADE;
CREATE TABLE site_events(
  id BIGSERIAL PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  time TIMESTAMP NOT NULL,
  level TEXT NOT NULL,
  data JSONB NOT NULL
);

ALTER SEQUENCE site_events_id_seq RESTART WITH 1042;

COMMIT;
