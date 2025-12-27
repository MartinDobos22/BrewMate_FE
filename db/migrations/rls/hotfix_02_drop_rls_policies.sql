-- Drop legacy RLS policies before type changes (incremental hotfix migration; safe to run on existing DBs).
DO $$ BEGIN
  IF to_regclass('public.user_taste_profile') IS NOT NULL THEN
    DROP POLICY IF EXISTS select_own_user_taste_profile ON public.user_taste_profile;
    DROP POLICY IF EXISTS insert_own_user_taste_profile ON public.user_taste_profile;
    DROP POLICY IF EXISTS update_own_user_taste_profile ON public.user_taste_profile;
    DROP POLICY IF EXISTS delete_own_user_taste_profile ON public.user_taste_profile;
  END IF;

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
