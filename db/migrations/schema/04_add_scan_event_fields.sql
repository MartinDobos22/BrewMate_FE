-- Add additional scan event fields for OCR metadata.
ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS original_text text,
  ADD COLUMN IF NOT EXISTS corrected_text text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS roast_level text,
  ADD COLUMN IF NOT EXISTS flavor_notes jsonb,
  ADD COLUMN IF NOT EXISTS processing text,
  ADD COLUMN IF NOT EXISTS roast_date text,
  ADD COLUMN IF NOT EXISTS varietals jsonb,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;
