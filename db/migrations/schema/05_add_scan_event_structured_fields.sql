-- Add structured confidence/uncertainty payloads to scan events.
ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS structured_confidence jsonb,
  ADD COLUMN IF NOT EXISTS structured_uncertainty jsonb;
