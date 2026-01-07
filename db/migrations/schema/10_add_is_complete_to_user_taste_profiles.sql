-- Add explicit completion marker for taste profiles based on quiz answers or taste vectors.
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    ALTER TABLE public.user_taste_profiles
      ADD COLUMN IF NOT EXISTS is_complete boolean NOT NULL DEFAULT false;

    UPDATE public.user_taste_profiles utp
      SET is_complete = true
      WHERE (
        (
          utp.quiz_answers IS NOT NULL
          AND jsonb_typeof(utp.quiz_answers) = 'object'
          AND EXISTS (
            SELECT 1
            FROM jsonb_object_keys(utp.quiz_answers)
            LIMIT 1
          )
        )
        OR
        (
          utp.taste_vector IS NOT NULL
          AND jsonb_typeof(utp.taste_vector) = 'object'
          AND jsonb_typeof(utp.taste_vector->'sweetness') = 'number'
          AND jsonb_typeof(utp.taste_vector->'acidity') = 'number'
          AND jsonb_typeof(utp.taste_vector->'bitterness') = 'number'
          AND jsonb_typeof(utp.taste_vector->'body') = 'number'
          AND (utp.taste_vector->>'sweetness')::numeric BETWEEN 0 AND 10
          AND (utp.taste_vector->>'acidity')::numeric BETWEEN 0 AND 10
          AND (utp.taste_vector->>'bitterness')::numeric BETWEEN 0 AND 10
          AND (utp.taste_vector->>'body')::numeric BETWEEN 0 AND 10
        )
      );
  END IF;
END $$;
