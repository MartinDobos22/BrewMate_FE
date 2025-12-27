-- Creates indexes for query performance.
CREATE INDEX idx_brew_history_user_created_at ON public.brew_history(user_id, created_at DESC);
CREATE INDEX idx_brew_history_recipe_id ON public.brew_history(recipe_id);
CREATE INDEX idx_brew_history_flavor_notes ON public.brew_history USING gin (flavor_notes);
CREATE INDEX idx_brew_history_user_id ON public.brew_history(user_id);

CREATE INDEX idx_learning_events_user_created_at ON public.learning_events(user_id, created_at DESC);
CREATE INDEX idx_learning_events_event_type ON public.learning_events(event_type);
CREATE INDEX idx_learning_events_user_id ON public.learning_events(user_id);

CREATE INDEX idx_user_taste_profile_user_id ON public.user_taste_profile(user_id);

CREATE INDEX idx_recipe_profiles_tags ON public.recipe_profiles USING gin (tags);

CREATE INDEX idx_user_recipes_user_created_at ON public.user_recipes(user_id, created_at DESC);

CREATE INDEX idx_user_coffees_user ON public.user_coffees(user_id);
CREATE INDEX idx_user_coffees_flavor_notes ON public.user_coffees USING gin (flavor_notes);

CREATE INDEX idx_scan_events_user_created_at ON public.scan_events(user_id, created_at DESC);
CREATE INDEX idx_scan_events_barcode ON public.scan_events(barcode);

CREATE INDEX idx_user_statistics_updated_at ON public.user_statistics(updated_at DESC);
