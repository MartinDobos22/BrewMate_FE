-- Create user_id indexes for fast filtering (incremental hotfix migration; safe to run on existing DBs).
CREATE INDEX IF NOT EXISTS idx_user_taste_profile_user_id ON public.user_taste_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_brew_history_user_id ON public.brew_history(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_id ON public.learning_events(user_id);
