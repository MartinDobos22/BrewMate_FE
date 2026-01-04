ALTER TABLE public.scan_events
ADD COLUMN IF NOT EXISTS structured_metadata jsonb,
ADD COLUMN IF NOT EXISTS structured_confidence jsonb,
ADD COLUMN IF NOT EXISTS structured_raw jsonb;
