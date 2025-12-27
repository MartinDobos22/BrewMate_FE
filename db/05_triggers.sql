-- Creates triggers for timestamps and stats updates.
CREATE TRIGGER trg_touch_user_taste_profiles
  BEFORE UPDATE ON public.user_taste_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_touch_user_taste_profile
  BEFORE UPDATE ON public.user_taste_profile
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
