BEGIN;

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users(
  id uuid PRIMARY KEY DEFAULT ext.gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

DROP TABLE IF EXISTS access_tokens CASCADE;
CREATE TABLE access_tokens(
  token TEXT PRIMARY KEY DEFAULT encode(ext.gen_random_bytes(16), 'hex'),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMP
);

DROP TABLE IF EXISTS sites CASCADE;
CREATE TABLE sites(
  id TEXT PRIMARY KEY,
  name TEXT,
  owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  system_trouble_status TEXT[]
);

CREATE UNIQUE INDEX sites_owner_id_name ON sites(name,owner_id);

DROP TABLE IF EXISTS site_partitions CASCADE;
CREATE TABLE site_partitions(
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  id INTEGER NOT NULL,
  status TEXT,
	trouble_state_led BOOLEAN,
	keypad_led_flash_state TEXT[],
	keypad_led_state TEXT[],
  PRIMARY KEY (site_id, id)
);

DROP TABLE IF EXISTS site_zones CASCADE;
CREATE TABLE site_zones(
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  id INTEGER NOT NULL,
  partition_id INTEGER NOT NULL,
  status TEXT,
  PRIMARY KEY (site_id, id)
);

DROP TABLE IF EXISTS site_events CASCADE;
CREATE TABLE site_events(
  id BIGSERIAL PRIMARY KEY,
  site_id TEXT NOT NULL,
  received_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  event JSONB NOT NULL
);

CREATE INDEX site_events_site_id ON site_events(site_id);

ALTER SEQUENCE site_events_id_seq RESTART WITH 1042;

COMMIT;
