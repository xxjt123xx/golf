-- Golf app schema. Better Auth owns "user", "session", "account" and the oauth* tables.

-- Courses are a shared catalog: any golfer can add one, everyone can use it.
CREATE TABLE courses (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  city               TEXT,
  region             TEXT,           -- state / province
  country            TEXT,
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX courses_name ON courses (lower(name));

CREATE TABLE tees (
  id            TEXT PRIMARY KEY,
  course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                 -- "Blue", "White", ...
  par           SMALLINT NOT NULL,
  course_rating NUMERIC(4,1),
  slope         SMALLINT CHECK (slope BETWEEN 55 AND 155),
  yardage       INTEGER,
  UNIQUE (course_id, name)
);

CREATE TABLE tee_holes (
  tee_id       TEXT NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
  hole_number  SMALLINT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par          SMALLINT NOT NULL CHECK (par BETWEEN 3 AND 6),
  stroke_index SMALLINT CHECK (stroke_index BETWEEN 1 AND 18),
  yardage      INTEGER,
  PRIMARY KEY (tee_id, hole_number)
);

-- Equipment owned by a golfer: clubs, balls, and anything else they want to track.
CREATE TABLE equipment (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN
                ('driver','fairway_wood','hybrid','iron','wedge','putter','ball','bag','shoes','rangefinder','other')),
  label       TEXT NOT NULL,                   -- "7 iron", "Pro V1"
  brand       TEXT,
  model       TEXT,
  loft        NUMERIC(4,1),
  shaft       TEXT,
  acquired_on DATE,
  retired_on  DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX equipment_user ON equipment (user_id);

CREATE TABLE rounds (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  course_id           TEXT NOT NULL REFERENCES courses(id),
  tee_id              TEXT REFERENCES tees(id),
  played_on           DATE NOT NULL,
  holes_planned       SMALLINT NOT NULL DEFAULT 18 CHECK (holes_planned IN (9, 18)),
  starting_hole       SMALLINT NOT NULL DEFAULT 1 CHECK (starting_hole IN (1, 10)),
  status              TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  total_score         SMALLINT,                -- set on finish (sum of holes, or entered directly)
  adjusted_gross      SMALLINT,                -- WHS net double bogey adjusted
  differential        NUMERIC(4,1),            -- WHS score differential (18-hole rounds with rating/slope)
  counts_for_handicap BOOLEAN NOT NULL DEFAULT true,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);
CREATE INDEX rounds_user_date ON rounds (user_id, played_on DESC);

-- Hole-by-hole scores for a round.
CREATE TABLE round_holes (
  round_id    TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number SMALLINT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  strokes     SMALLINT NOT NULL CHECK (strokes BETWEEN 1 AND 20),
  putts       SMALLINT CHECK (putts BETWEEN 0 AND 10),
  fairway     TEXT CHECK (fairway IN ('hit','left','right','short','long','na')),
  gir         BOOLEAN,
  penalties   SMALLINT CHECK (penalties BETWEEN 0 AND 10),
  notes       TEXT,
  PRIMARY KEY (round_id, hole_number)
);

-- Equipment in the bag for a round.
CREATE TABLE round_equipment (
  round_id     TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  PRIMARY KEY (round_id, equipment_id)
);

-- Individual shots ("hits"), optionally with the club used.
CREATE TABLE shots (
  id             TEXT PRIMARY KEY,
  round_id       TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number    SMALLINT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  shot_number    SMALLINT NOT NULL CHECK (shot_number BETWEEN 1 AND 20),
  equipment_id   TEXT REFERENCES equipment(id) ON DELETE SET NULL,
  distance_yards SMALLINT CHECK (distance_yards BETWEEN 0 AND 450),
  lie            TEXT CHECK (lie IN ('tee','fairway','rough','sand','recovery','green','other')),
  result         TEXT CHECK (result IN ('fairway','rough','sand','green','water','out_of_bounds','recovery','holed','other')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, hole_number, shot_number)
);
CREATE INDEX shots_equipment ON shots (equipment_id);

-- Official handicap index entries the golfer records (e.g. from their club / GHIN).
CREATE TABLE handicap_records (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  recorded_on    DATE NOT NULL,
  handicap_index NUMERIC(3,1) NOT NULL CHECK (handicap_index BETWEEN -10 AND 54),
  source         TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX handicap_records_user ON handicap_records (user_id, recorded_on DESC);

-- Practice: duration and notes only, no per-shot detail.
CREATE TABLE practice_sessions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  practiced_on     DATE NOT NULL,
  duration_minutes SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
  focus            TEXT,                     -- "putting", "driving range", "short game"...
  location         TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX practice_user_date ON practice_sessions (user_id, practiced_on DESC);
