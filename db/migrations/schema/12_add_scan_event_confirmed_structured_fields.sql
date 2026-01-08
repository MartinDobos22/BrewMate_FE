-- Add fields for storing user-confirmed structured OCR metadata.
ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS confirmed_structured_metadata jsonb,
  ADD COLUMN IF NOT EXISTS confirmed_structured_confidence jsonb,
  ADD COLUMN IF NOT EXISTS confirmed_structured_raw jsonb;
