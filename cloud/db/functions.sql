BEGIN;

DROP FUNCTION IF EXISTS validate_auth_token(access_tokens, uuid, text);
CREATE FUNCTION validate_auth_token(access_tokens, uuid, text) RETURNS BOOLEAN AS
$$
  SELECT $1.token = $3
    AND ($1.user_id IS NULL AND $2 IS NULL OR $1.user_id = $2)
    AND ($1.expires_at IS NULL OR $1.expires_at > NOW())
$$ LANGUAGE sql;

-- CREATE FUNCTION update_state_shadow(constraint text, update text)


COMMIT;
