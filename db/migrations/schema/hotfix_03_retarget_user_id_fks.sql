-- Retarget user_id columns to text + app_users FK (incremental hotfix migration; safe to run on existing DBs).
DO $$ BEGIN
  IF to_regclass('public.user_taste_profile') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profile DROP CONSTRAINT IF EXISTS user_taste_profile_user_id_fkey;
    ALTER TABLE public.user_taste_profile ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.user_taste_profile ADD CONSTRAINT user_taste_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profiles DROP CONSTRAINT IF EXISTS user_taste_profiles_user_id_fkey;
    ALTER TABLE public.user_taste_profiles ALTER COLUMN user_id TYPE text USING user_id::text;
    ALTER TABLE public.user_taste_profiles ADD CONSTRAINT user_taste_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
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
