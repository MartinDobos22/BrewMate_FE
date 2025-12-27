-- Refresh triggers to point at text-based handlers (incremental hotfix migration; safe to run on existing DBs).
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
