-- Creates activity and aggregation tables.
-- User brew diary entries
CREATE TABLE public.brew_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  recipe_id uuid,
  beans jsonb NOT NULL DEFAULT '{}'::jsonb,
  grind_size text,
  water_temp numeric(5,2),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  taste_feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  flavor_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_time_of_day text,
  context_weather jsonb,
  mood_before text,
  mood_after text,
  modifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Learning signals tied to brews
CREATE TABLE public.learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  brew_history_id uuid REFERENCES public.brew_history(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('liked','disliked','favorited','repeated','shared','ignored','consumed','scanned')),
  event_weight numeric(6,3) NOT NULL DEFAULT 1.0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Recipe taste vectors used by recommendation edge function
CREATE TABLE public.recipe_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id text NOT NULL UNIQUE,
  title text,
  brew_method text,
  taste_vector jsonb NOT NULL DEFAULT jsonb_build_object('sweetness',5,'acidity',5,'bitterness',5,'body',5),
  flavor_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User-authored recipes for sharing or history
CREATE TABLE public.user_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  method text NOT NULL,
  instructions text NOT NULL,
  brew_device text,
  is_shared boolean NOT NULL DEFAULT false,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Saved coffees in user library/inventory
CREATE TABLE public.user_coffees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  origin text,
  roast_level text,
  flavor_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  rating numeric(3,2) CHECK (rating BETWEEN 0 AND 5),
  is_favorite boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now()
);

-- OCR/scan events to build lightweight history
CREATE TABLE public.scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  coffee_name text,
  brand text,
  barcode text,
  image_url text,
  match_score numeric(5,2) CHECK (match_score BETWEEN 0 AND 100),
  is_recommended boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Aggregated implicit preference signals per coffee
CREATE TABLE public.user_signals (
  user_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  coffee_id text NOT NULL,
  coffee_name text NOT NULL,
  scans integer NOT NULL DEFAULT 0,
  repeats integer NOT NULL DEFAULT 0,
  favorites integer NOT NULL DEFAULT 0,
  ignores integer NOT NULL DEFAULT 0,
  consumed integer NOT NULL DEFAULT 0,
  last_feedback text,
  last_feedback_reason text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, coffee_id)
);

-- Aggregated counters to avoid heavy COUNT(*) calls
CREATE TABLE public.user_statistics (
  user_id text PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
  brew_count integer NOT NULL DEFAULT 0,
  recipe_count integer NOT NULL DEFAULT 0,
  scan_count integer NOT NULL DEFAULT 0,
  coffee_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
