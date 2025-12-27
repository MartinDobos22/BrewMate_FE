-- Replace legacy stats helpers with text-based variants (incremental hotfix migration; safe to run on existing DBs).
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
