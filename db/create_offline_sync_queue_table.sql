-- Supabase SQL schéma pre frontu offline synchronizácie
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  operation TEXT NOT NULL,
  payload JSONB NOT NULL,
  retries SMALLINT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS offline_sync_queue_status_idx ON offline_sync_queue(status);
