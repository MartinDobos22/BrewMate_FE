-- BrewMate Supabase schema reset
-- Drops legacy tables/triggers/functions and builds lean structure used by the app.

-- Ensure extensions
create extension if not exists "pgcrypto";

-- =====================
-- DROP OLD TABLES
-- =====================
DROP TABLE IF EXISTS public.user_levels CASCADE;
DROP TABLE IF EXISTS public.user_daily_progress CASCADE;
DROP TABLE IF EXISTS public.user_coffee_preferences CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.seasonal_events CASCADE;
DROP TABLE IF EXISTS public.quest_definitions CASCADE;
DROP TABLE IF EXISTS public.preference_updates CASCADE;
DROP TABLE IF EXISTS public.offline_sync_queue CASCADE;
DROP TABLE IF EXISTS public.ocr_logs CASCADE;
DROP TABLE IF EXISTS public.learning_events CASCADE;
DROP TABLE IF EXISTS public.gamification_state_snapshots CASCADE;
DROP TABLE IF EXISTS public.daily_quest_instances CASCADE;
DROP TABLE IF EXISTS public.daily_quests CASCADE;
DROP TABLE IF EXISTS public.coffees CASCADE;
DROP TABLE IF EXISTS public.coffee_ratings CASCADE;
DROP TABLE IF EXISTS public.brew_recipes CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.achievement_definitions CASCADE;
DROP TABLE IF EXISTS public.user_onboarding_responses CASCADE;
DROP TABLE IF EXISTS public.user_taste_profile CASCADE;
DROP TABLE IF EXISTS public.brew_history CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
-- Drop current tables so the script is idempotent when re-run
DROP TABLE IF EXISTS public.user_taste_profiles CASCADE;
DROP TABLE IF EXISTS public.learning_events CASCADE;
DROP TABLE IF EXISTS public.recipe_profiles CASCADE;
DROP TABLE IF EXISTS public.user_recipes CASCADE;
DROP TABLE IF EXISTS public.user_coffees CASCADE;
DROP TABLE IF EXISTS public.scan_events CASCADE;
DROP TABLE IF EXISTS public.user_statistics CASCADE;

-- Safely remove old trigger helpers if present
DO $$ BEGIN
  IF to_regclass('public.user_taste_profile') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_touch_user_taste_profile ON public.user_taste_profile;
  END IF;

  IF to_regclass('public.brew_history') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_touch_brew_history ON public.brew_history;
    DROP TRIGGER IF EXISTS trg_brew_history_insert ON public.brew_history;
    DROP TRIGGER IF EXISTS trg_brew_history_delete ON public.brew_history;
  END IF;

  IF to_regclass('public.user_recipes') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_user_recipes_insert ON public.user_recipes;
    DROP TRIGGER IF EXISTS trg_user_recipes_delete ON public.user_recipes;
    DROP TRIGGER IF EXISTS trg_touch_user_recipes ON public.user_recipes;
  END IF;

  IF to_regclass('public.scan_events') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_scan_events_insert ON public.scan_events;
    DROP TRIGGER IF EXISTS trg_scan_events_delete ON public.scan_events;
  END IF;

  IF to_regclass('public.user_coffees') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_user_coffees_insert ON public.user_coffees;
    DROP TRIGGER IF EXISTS trg_user_coffees_delete ON public.user_coffees;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.touch_user_taste_profile() CASCADE;
DROP FUNCTION IF EXISTS public.touch_brew_history() CASCADE;

DROP FUNCTION IF EXISTS public.ensure_user_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_delta(uuid,int,int,int,int) CASCADE;
DROP FUNCTION IF EXISTS public.handle_brew_history_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_brew_history_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_recipe_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_recipe_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_scan_event_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_scan_event_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_coffee_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_coffee_delete() CASCADE;

-- =====================
-- CREATE NEW DATABASE STRUCTURE
-- =====================

-- Core taste profile maintained by personalization engine
CREATE TABLE public.user_taste_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sweetness numeric(4,2) NOT NULL DEFAULT 5 CHECK (sweetness BETWEEN 0 AND 10),
  acidity numeric(4,2) NOT NULL DEFAULT 5 CHECK (acidity BETWEEN 0 AND 10),
  bitterness numeric(4,2) NOT NULL DEFAULT 5 CHECK (bitterness BETWEEN 0 AND 10),
  body numeric(4,2) NOT NULL DEFAULT 5 CHECK (body BETWEEN 0 AND 10),
  flavor_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  milk_preferences jsonb NOT NULL DEFAULT jsonb_build_object('types', jsonb_build_array('plnotučné'), 'texture', 'krémová'),
  caffeine_sensitivity text NOT NULL DEFAULT 'medium' CHECK (caffeine_sensitivity IN ('low','medium','high')),
  preferred_strength text NOT NULL DEFAULT 'balanced' CHECK (preferred_strength IN ('light','balanced','strong')),
  seasonal_adjustments jsonb NOT NULL DEFAULT '[]'::jsonb,
  preference_confidence numeric(4,3) NOT NULL DEFAULT 0.35 CHECK (preference_confidence BETWEEN 0 AND 1),
  last_recalculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User brew diary entries
CREATE TABLE public.brew_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brew_history_id uuid REFERENCES public.brew_history(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('liked','disliked','favorited','repeated','shared')),
  event_weight numeric(6,3) NOT NULL DEFAULT 1.0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Persisted answers from personalization onboarding
CREATE TABLE public.user_onboarding_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  analyzed_profile jsonb,
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
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_name text,
  brand text,
  barcode text,
  image_url text,
  match_score numeric(5,2) CHECK (match_score BETWEEN 0 AND 100),
  is_recommended boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Aggregated counters to avoid heavy COUNT(*) calls
CREATE TABLE public.user_statistics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brew_count integer NOT NULL DEFAULT 0,
  recipe_count integer NOT NULL DEFAULT 0,
  scan_count integer NOT NULL DEFAULT 0,
  coffee_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- CREATE NEW FUNCTIONS
-- =====================

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure stats row exists
CREATE OR REPLACE FUNCTION public.ensure_user_stats(u_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_statistics(user_id)
  VALUES (u_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Generic counter updater
CREATE OR REPLACE FUNCTION public.update_user_stats_delta(
  u_id uuid,
  brew_delta int,
  recipe_delta int,
  scan_delta int,
  coffee_delta int
) RETURNS void AS $$
BEGIN
  PERFORM public.ensure_user_stats(u_id);
  UPDATE public.user_statistics
  SET
    brew_count = GREATEST(0, brew_count + COALESCE(brew_delta, 0)),
    recipe_count = GREATEST(0, recipe_count + COALESCE(recipe_delta, 0)),
    scan_count = GREATEST(0, scan_count + COALESCE(scan_delta, 0)),
    coffee_count = GREATEST(0, coffee_count + COALESCE(coffee_delta, 0)),
    updated_at = now()
  WHERE user_id = u_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger handlers for stats
CREATE OR REPLACE FUNCTION public.handle_brew_history_insert()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_user_stats_delta(NEW.user_id, 1, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_brew_history_delete()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_user_stats_delta(OLD.user_id, -1, 0, 0, 0);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_user_recipe_insert()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_user_stats_delta(NEW.user_id, 0, 1, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_user_recipe_delete()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_user_stats_delta(OLD.user_id, 0, -1, 0, 0);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_scan_event_insert()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_user_stats_delta(NEW.user_id, 0, 0, 1, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_scan_event_delete()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_user_stats_delta(OLD.user_id, 0, 0, -1, 0);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_user_coffee_insert()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_user_stats_delta(NEW.user_id, 0, 0, 0, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_user_coffee_delete()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_user_stats_delta(OLD.user_id, 0, 0, 0, -1);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- CREATE NEW TRIGGERS
-- =====================

CREATE TRIGGER trg_touch_user_taste_profiles
  BEFORE UPDATE ON public.user_taste_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_touch_brew_history
  BEFORE UPDATE ON public.brew_history
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_touch_recipe_profiles
  BEFORE UPDATE ON public.recipe_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_touch_user_recipes
  BEFORE UPDATE ON public.user_recipes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_brew_history_insert
  AFTER INSERT ON public.brew_history
  FOR EACH ROW EXECUTE FUNCTION public.handle_brew_history_insert();

CREATE TRIGGER trg_brew_history_delete
  AFTER DELETE ON public.brew_history
  FOR EACH ROW EXECUTE FUNCTION public.handle_brew_history_delete();

CREATE TRIGGER trg_user_recipes_insert
  AFTER INSERT ON public.user_recipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_recipe_insert();

CREATE TRIGGER trg_user_recipes_delete
  AFTER DELETE ON public.user_recipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_recipe_delete();

CREATE TRIGGER trg_scan_events_insert
  AFTER INSERT ON public.scan_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_scan_event_insert();

CREATE TRIGGER trg_scan_events_delete
  AFTER DELETE ON public.scan_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_scan_event_delete();

CREATE TRIGGER trg_user_coffees_insert
  AFTER INSERT ON public.user_coffees
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_coffee_insert();

CREATE TRIGGER trg_user_coffees_delete
  AFTER DELETE ON public.user_coffees
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_coffee_delete();

-- =====================
-- RLS POLICIES
-- =====================

ALTER TABLE public.user_taste_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brew_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coffees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;

-- Ownership based policies
CREATE POLICY select_own_user_taste_profiles ON public.user_taste_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_user_taste_profiles ON public.user_taste_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_user_taste_profiles ON public.user_taste_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_own_user_taste_profiles ON public.user_taste_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY select_own_brew_history ON public.brew_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_brew_history ON public.brew_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_brew_history ON public.brew_history FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_own_brew_history ON public.brew_history FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY select_own_learning_events ON public.learning_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_learning_events ON public.learning_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_learning_events ON public.learning_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_own_learning_events ON public.learning_events FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY select_own_onboarding ON public.user_onboarding_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_onboarding ON public.user_onboarding_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_onboarding ON public.user_onboarding_responses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_own_onboarding ON public.user_onboarding_responses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY select_own_user_recipes ON public.user_recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_user_recipes ON public.user_recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_user_recipes ON public.user_recipes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_own_user_recipes ON public.user_recipes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY select_own_user_coffees ON public.user_coffees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_user_coffees ON public.user_coffees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_user_coffees ON public.user_coffees FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_own_user_coffees ON public.user_coffees FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY select_own_scan_events ON public.scan_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_scan_events ON public.scan_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_scan_events ON public.scan_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_own_scan_events ON public.scan_events FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY select_own_statistics ON public.user_statistics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY update_own_statistics ON public.user_statistics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX idx_brew_history_user_created_at ON public.brew_history(user_id, created_at DESC);
CREATE INDEX idx_brew_history_recipe_id ON public.brew_history(recipe_id);
CREATE INDEX idx_brew_history_flavor_notes ON public.brew_history USING gin (flavor_notes);

CREATE INDEX idx_learning_events_user_created_at ON public.learning_events(user_id, created_at DESC);
CREATE INDEX idx_learning_events_event_type ON public.learning_events(event_type);

CREATE INDEX idx_onboarding_user_created_at ON public.user_onboarding_responses(user_id, created_at DESC);

CREATE INDEX idx_recipe_profiles_tags ON public.recipe_profiles USING gin (tags);

CREATE INDEX idx_user_recipes_user_created_at ON public.user_recipes(user_id, created_at DESC);

CREATE INDEX idx_user_coffees_user ON public.user_coffees(user_id);
CREATE INDEX idx_user_coffees_flavor_notes ON public.user_coffees USING gin (flavor_notes);

CREATE INDEX idx_scan_events_user_created_at ON public.scan_events(user_id, created_at DESC);
CREATE INDEX idx_scan_events_barcode ON public.scan_events(barcode);

CREATE INDEX idx_user_statistics_updated_at ON public.user_statistics(updated_at DESC);
