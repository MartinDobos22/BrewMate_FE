-- Migration delta to align existing databases with the Firebase-friendly schema
-- Introduces app_users shadow table and retargets user_id FKs to text IDs
-- without requiring a full reset.

-- Ensure pgcrypto for UUID generation (harmless if already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Create app_users shadow table for Firebase UID storage
CREATE TABLE IF NOT EXISTS public.app_users (
  id text PRIMARY KEY,
  email text UNIQUE,
  name text,
  experience_level text,
  ai_recommendation text,
  manual_input text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF to_regclass('public.app_users') IS NOT NULL THEN
    ALTER TABLE public.app_users
      ADD COLUMN IF NOT EXISTS experience_level text,
      ADD COLUMN IF NOT EXISTS ai_recommendation text,
      ADD COLUMN IF NOT EXISTS manual_input text;
  END IF;
END $$;

-- Drop RLS policies that reference the old uuid-typed user_id so type changes succeed
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_user_taste_profiles ON public.user_taste_profiles;
    DROP POLICY IF EXISTS insert_own_user_taste_profiles ON public.user_taste_profiles;
    DROP POLICY IF EXISTS update_own_user_taste_profiles ON public.user_taste_profiles;
    DROP POLICY IF EXISTS delete_own_user_taste_profiles ON public.user_taste_profiles;
  END IF;

  IF to_regclass('public.brew_history') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_brew_history ON public.brew_history;
    DROP POLICY IF EXISTS insert_own_brew_history ON public.brew_history;
    DROP POLICY IF EXISTS update_own_brew_history ON public.brew_history;
    DROP POLICY IF EXISTS delete_own_brew_history ON public.brew_history;
  END IF;

  IF to_regclass('public.learning_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_learning_events ON public.learning_events;
    DROP POLICY IF EXISTS insert_own_learning_events ON public.learning_events;
    DROP POLICY IF EXISTS update_own_learning_events ON public.learning_events;
    DROP POLICY IF EXISTS delete_own_learning_events ON public.learning_events;
  END IF;

  IF to_regclass('public.user_onboarding_responses') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_onboarding ON public.user_onboarding_responses;
    DROP POLICY IF EXISTS insert_own_onboarding ON public.user_onboarding_responses;
    DROP POLICY IF EXISTS update_own_onboarding ON public.user_onboarding_responses;
    DROP POLICY IF EXISTS delete_own_onboarding ON public.user_onboarding_responses;
  END IF;

  IF to_regclass('public.user_recipes') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_user_recipes ON public.user_recipes;
    DROP POLICY IF EXISTS insert_own_user_recipes ON public.user_recipes;
    DROP POLICY IF EXISTS update_own_user_recipes ON public.user_recipes;
    DROP POLICY IF EXISTS delete_own_user_recipes ON public.user_recipes;
  END IF;

  IF to_regclass('public.user_coffees') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_user_coffees ON public.user_coffees;
    DROP POLICY IF EXISTS insert_own_user_coffees ON public.user_coffees;
    DROP POLICY IF EXISTS update_own_user_coffees ON public.user_coffees;
    DROP POLICY IF EXISTS delete_own_user_coffees ON public.user_coffees;
  END IF;

  IF to_regclass('public.scan_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_scan_events ON public.scan_events;
    DROP POLICY IF EXISTS insert_own_scan_events ON public.scan_events;
    DROP POLICY IF EXISTS update_own_scan_events ON public.scan_events;
    DROP POLICY IF EXISTS delete_own_scan_events ON public.scan_events;
  END IF;

  IF to_regclass('public.user_statistics') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_statistics ON public.user_statistics;
    DROP POLICY IF EXISTS update_own_statistics ON public.user_statistics;
  END IF;
END $$;

-- 2) Retarget user_id foreign keys to app_users with text type
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profiles DROP CONSTRAINT IF EXISTS user_taste_profiles_user_id_fkey;
    ALTER TABLE public.user_taste_profiles ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.user_taste_profiles ADD CONSTRAINT user_taste_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
    ALTER TABLE public.user_taste_profiles
      ADD COLUMN IF NOT EXISTS coffee_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF to_regclass('public.brew_history') IS NOT NULL THEN
    ALTER TABLE public.brew_history DROP CONSTRAINT IF EXISTS brew_history_user_id_fkey;
    ALTER TABLE public.brew_history ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.brew_history ADD CONSTRAINT brew_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.learning_events') IS NOT NULL THEN
    ALTER TABLE public.learning_events DROP CONSTRAINT IF EXISTS learning_events_user_id_fkey;
    ALTER TABLE public.learning_events ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.learning_events ADD CONSTRAINT learning_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.user_onboarding_responses') IS NOT NULL THEN
    ALTER TABLE public.user_onboarding_responses DROP CONSTRAINT IF EXISTS user_onboarding_responses_user_id_fkey;
    ALTER TABLE public.user_onboarding_responses ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.user_onboarding_responses ADD CONSTRAINT user_onboarding_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.user_recipes') IS NOT NULL THEN
    ALTER TABLE public.user_recipes DROP CONSTRAINT IF EXISTS user_recipes_user_id_fkey;
    ALTER TABLE public.user_recipes ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.user_recipes ADD CONSTRAINT user_recipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.user_coffees') IS NOT NULL THEN
    ALTER TABLE public.user_coffees DROP CONSTRAINT IF EXISTS user_coffees_user_id_fkey;
    ALTER TABLE public.user_coffees ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.user_coffees ADD CONSTRAINT user_coffees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.scan_events') IS NOT NULL THEN
    ALTER TABLE public.scan_events DROP CONSTRAINT IF EXISTS scan_events_user_id_fkey;
    ALTER TABLE public.scan_events ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.scan_events ADD CONSTRAINT scan_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.user_statistics') IS NOT NULL THEN
    ALTER TABLE public.user_statistics DROP CONSTRAINT IF EXISTS user_statistics_user_id_fkey;
    ALTER TABLE public.user_statistics ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.user_statistics ADD CONSTRAINT user_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Replace legacy UUID-based stats helpers with text-based variants
DROP FUNCTION IF EXISTS public.update_user_stats_delta(uuid,int,int,int,int) CASCADE;
DROP FUNCTION IF EXISTS public.handle_brew_history_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_brew_history_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_recipe_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_recipe_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_scan_event_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_scan_event_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_coffee_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_coffee_delete() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_stats(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.ensure_user_stats(u_id text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_statistics(user_id)
  VALUES (u_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_user_stats_delta(
  u_id text,
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

-- 4) Refresh triggers to point at new handlers (only if the tables exist)
DO $$ BEGIN
  IF to_regclass('public.brew_history') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_brew_history_insert ON public.brew_history;
    DROP TRIGGER IF EXISTS trg_brew_history_delete ON public.brew_history;
    CREATE TRIGGER trg_brew_history_insert
      AFTER INSERT ON public.brew_history
      FOR EACH ROW EXECUTE FUNCTION public.handle_brew_history_insert();
    CREATE TRIGGER trg_brew_history_delete
      AFTER DELETE ON public.brew_history
      FOR EACH ROW EXECUTE FUNCTION public.handle_brew_history_delete();
  END IF;

  IF to_regclass('public.user_recipes') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_user_recipes_insert ON public.user_recipes;
    DROP TRIGGER IF EXISTS trg_user_recipes_delete ON public.user_recipes;
    CREATE TRIGGER trg_user_recipes_insert
      AFTER INSERT ON public.user_recipes
      FOR EACH ROW EXECUTE FUNCTION public.handle_user_recipe_insert();
    CREATE TRIGGER trg_user_recipes_delete
      AFTER DELETE ON public.user_recipes
      FOR EACH ROW EXECUTE FUNCTION public.handle_user_recipe_delete();
  END IF;

  IF to_regclass('public.scan_events') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_scan_events_insert ON public.scan_events;
    DROP TRIGGER IF EXISTS trg_scan_events_delete ON public.scan_events;
    CREATE TRIGGER trg_scan_events_insert
      AFTER INSERT ON public.scan_events
      FOR EACH ROW EXECUTE FUNCTION public.handle_scan_event_insert();
    CREATE TRIGGER trg_scan_events_delete
      AFTER DELETE ON public.scan_events
      FOR EACH ROW EXECUTE FUNCTION public.handle_scan_event_delete();
  END IF;

  IF to_regclass('public.user_coffees') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_user_coffees_insert ON public.user_coffees;
    DROP TRIGGER IF EXISTS trg_user_coffees_delete ON public.user_coffees;
    CREATE TRIGGER trg_user_coffees_insert
      AFTER INSERT ON public.user_coffees
      FOR EACH ROW EXECUTE FUNCTION public.handle_user_coffee_insert();
    CREATE TRIGGER trg_user_coffees_delete
      AFTER DELETE ON public.user_coffees
      FOR EACH ROW EXECUTE FUNCTION public.handle_user_coffee_delete();
  END IF;
END $$;

-- 5) Re-enable RLS before recreating ownership policies
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.brew_history') IS NOT NULL THEN
    ALTER TABLE public.brew_history ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.learning_events') IS NOT NULL THEN
    ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.user_onboarding_responses') IS NOT NULL THEN
    ALTER TABLE public.user_onboarding_responses ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.user_recipes') IS NOT NULL THEN
    ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.user_coffees') IS NOT NULL THEN
    ALTER TABLE public.user_coffees ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.scan_events') IS NOT NULL THEN
    ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.user_statistics') IS NOT NULL THEN
    ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Recreate ownership policies with text-based auth.uid() matching
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    CREATE POLICY select_own_user_taste_profiles ON public.user_taste_profiles FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY insert_own_user_taste_profiles ON public.user_taste_profiles FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY update_own_user_taste_profiles ON public.user_taste_profiles FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY delete_own_user_taste_profiles ON public.user_taste_profiles FOR DELETE USING ((auth.uid())::text = user_id);
  END IF;

  IF to_regclass('public.brew_history') IS NOT NULL THEN
    CREATE POLICY select_own_brew_history ON public.brew_history FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY insert_own_brew_history ON public.brew_history FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY update_own_brew_history ON public.brew_history FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY delete_own_brew_history ON public.brew_history FOR DELETE USING ((auth.uid())::text = user_id);
  END IF;

  IF to_regclass('public.learning_events') IS NOT NULL THEN
    CREATE POLICY select_own_learning_events ON public.learning_events FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY insert_own_learning_events ON public.learning_events FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY update_own_learning_events ON public.learning_events FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY delete_own_learning_events ON public.learning_events FOR DELETE USING ((auth.uid())::text = user_id);
  END IF;

  IF to_regclass('public.user_onboarding_responses') IS NOT NULL THEN
    CREATE POLICY select_own_onboarding ON public.user_onboarding_responses FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY insert_own_onboarding ON public.user_onboarding_responses FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY update_own_onboarding ON public.user_onboarding_responses FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY delete_own_onboarding ON public.user_onboarding_responses FOR DELETE USING ((auth.uid())::text = user_id);
  END IF;

  IF to_regclass('public.user_recipes') IS NOT NULL THEN
    CREATE POLICY select_own_user_recipes ON public.user_recipes FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY insert_own_user_recipes ON public.user_recipes FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY update_own_user_recipes ON public.user_recipes FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY delete_own_user_recipes ON public.user_recipes FOR DELETE USING ((auth.uid())::text = user_id);
  END IF;

  IF to_regclass('public.user_coffees') IS NOT NULL THEN
    CREATE POLICY select_own_user_coffees ON public.user_coffees FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY insert_own_user_coffees ON public.user_coffees FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY update_own_user_coffees ON public.user_coffees FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY delete_own_user_coffees ON public.user_coffees FOR DELETE USING ((auth.uid())::text = user_id);
  END IF;

  IF to_regclass('public.scan_events') IS NOT NULL THEN
    CREATE POLICY select_own_scan_events ON public.scan_events FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY insert_own_scan_events ON public.scan_events FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY update_own_scan_events ON public.scan_events FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY delete_own_scan_events ON public.scan_events FOR DELETE USING ((auth.uid())::text = user_id);
  END IF;

  IF to_regclass('public.user_statistics') IS NOT NULL THEN
    CREATE POLICY select_own_statistics ON public.user_statistics FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY update_own_statistics ON public.user_statistics FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
  END IF;
END $$;
