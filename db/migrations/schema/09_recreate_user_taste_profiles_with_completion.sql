-- Recreate view with updated completion marker for taste profiles.
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    EXECUTE $view$
      DROP VIEW IF EXISTS public.user_taste_profiles_with_completion;
      CREATE VIEW public.user_taste_profiles_with_completion AS
      SELECT
        utp.*,
        (
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
            AND EXISTS (
              SELECT 1
              FROM jsonb_each(utp.taste_vector) AS taste(key, value)
              WHERE jsonb_typeof(taste.value) = 'number'
              LIMIT 1
            )
          )
        ) AS is_complete
      FROM public.user_taste_profiles utp
    $view$;
  END IF;
END $$;
