-- Add taste profile completion marker based on quiz answers (incremental hotfix migration).
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profiles
      ADD COLUMN IF NOT EXISTS taste_profile_completed boolean NOT NULL DEFAULT false;

    UPDATE public.user_taste_profiles utp
      SET taste_profile_completed = true
      WHERE utp.quiz_answers IS NOT NULL
        AND jsonb_typeof(utp.quiz_answers) = 'object'
        AND EXISTS (
          SELECT 1
          FROM jsonb_object_keys(utp.quiz_answers)
          LIMIT 1
        );
  END IF;
END $$;
