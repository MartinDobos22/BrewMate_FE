-- Extend taste profile schema with quiz fields (incremental hotfix migration; safe to run on existing DBs).
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profiles
      ADD COLUMN IF NOT EXISTS quiz_version text,
      ADD COLUMN IF NOT EXISTS quiz_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS taste_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS consistency_score numeric(4,3) NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS ai_recommendation text,
      ADD COLUMN IF NOT EXISTS manual_input text;
  END IF;
END $$;
