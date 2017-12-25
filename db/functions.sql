BEGIN;

DROP FUNCTION IF EXISTS validate_auth_token(auth_tokens, uuid, text);
CREATE FUNCTION validate_auth_token(auth_tokens, uuid, text) RETURNS BOOLEAN AS
$$
  SELECT $1.token = $3
    AND ($1.rec_id IS NULL AND $2 IS NULL OR $1.rec_id = $2)
    AND ($1.expires_at IS NULL OR $1.expires_at > NOW())
$$ LANGUAGE sql;

COMMIT;
