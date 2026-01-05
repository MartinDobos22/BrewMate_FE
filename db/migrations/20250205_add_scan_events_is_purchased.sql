ALTER TABLE public.scan_events
ADD COLUMN IF NOT EXISTS is_purchased boolean NOT NULL DEFAULT false;
