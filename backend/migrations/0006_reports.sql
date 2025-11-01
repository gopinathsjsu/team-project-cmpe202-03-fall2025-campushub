CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY,
  listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES users(id),
  reason       TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
