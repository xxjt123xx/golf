-- App tables. Better Auth's own tables (user, session, account, oauth*) come from `npx auth migrate`.
CREATE TABLE IF NOT EXISTS rounds (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  course_name  TEXT NOT NULL,
  played_on    DATE NOT NULL,
  holes        SMALLINT NOT NULL DEFAULT 18,
  score        SMALLINT NOT NULL,
  putts        SMALLINT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rounds_user_date ON rounds (user_id, played_on DESC);
