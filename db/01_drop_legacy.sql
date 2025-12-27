-- Drops legacy tables, triggers, and helper functions.
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
DROP TABLE IF EXISTS public.app_users CASCADE;

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

DROP FUNCTION IF EXISTS public.ensure_user_stats(text) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_delta(uuid,integer,integer,integer,integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_delta(text,integer,integer,integer,integer) CASCADE;
DROP FUNCTION IF EXISTS public.handle_brew_history_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_brew_history_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_recipe_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_recipe_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_scan_event_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_scan_event_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_coffee_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_coffee_delete() CASCADE;
