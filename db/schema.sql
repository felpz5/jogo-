CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_monitor BOOLEAN DEFAULT FALSE,
  card JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS game_session (
  id SERIAL PRIMARY KEY,
  active BOOLEAN DEFAULT TRUE,
  asked_questions INTEGER[] DEFAULT '{}',
  current_question_id INTEGER,
  winner_id INTEGER REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_answers (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  question_id INTEGER REFERENCES questions(id),
  marked BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bingo_attempts (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  valid BOOLEAN,
  attempted_at TIMESTAMP DEFAULT NOW()
);
