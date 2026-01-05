ALTER TABLE public.scan_events
ADD COLUMN IF NOT EXISTS original_text text,
ADD COLUMN IF NOT EXISTS corrected_text text;
