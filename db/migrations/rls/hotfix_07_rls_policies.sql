-- Re-enable RLS and recreate ownership policies (incremental hotfix migration; safe to run on existing DBs).
DO $$ BEGIN
  IF to_regclass('public.user_taste_profile') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profile ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.brew_history') IS NOT NULL THEN
    ALTER TABLE public.brew_history ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.learning_events') IS NOT NULL THEN
    ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
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

DO $$ BEGIN
  IF to_regclass('public.user_taste_profile') IS NOT NULL THEN
    CREATE POLICY select_own_user_taste_profile ON public.user_taste_profile FOR SELECT USING ((auth.uid())::text = user_id);
    CREATE POLICY insert_own_user_taste_profile ON public.user_taste_profile FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY update_own_user_taste_profile ON public.user_taste_profile FOR UPDATE USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
    CREATE POLICY delete_own_user_taste_profile ON public.user_taste_profile FOR DELETE USING ((auth.uid())::text = user_id);
  END IF;

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
