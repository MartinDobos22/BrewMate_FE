-- Creates scan events table for OCR history.
CREATE TABLE public.scan_events (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  coffee_name text,
  brand text,
  barcode text,
  image_url text,
  original_text text,
  corrected_text text,
  origin text,
  roast_level text,
  flavor_notes jsonb,
  processing text,
  roast_date text,
  varietals jsonb,
  thumbnail_url text,
  structured_confidence jsonb,
  structured_uncertainty jsonb,
  match_score numeric,
  is_recommended boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_events_user_created_at
  ON public.scan_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_barcode ON public.scan_events(barcode);
