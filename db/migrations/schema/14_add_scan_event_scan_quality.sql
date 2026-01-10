-- Add scan quality flag for OCR scan events.
ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS scan_quality text;
