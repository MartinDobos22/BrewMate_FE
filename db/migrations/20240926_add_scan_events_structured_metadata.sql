ALTER TABLE public.scan_events
ADD COLUMN IF NOT EXISTS structured_metadata jsonb;
