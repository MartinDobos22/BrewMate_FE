-- Create view with completion marker for taste profiles.
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.user_taste_profiles_with_completion AS
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
          OR (
            utp.taste_vector IS NOT NULL
            AND jsonb_typeof(utp.taste_vector) = 'object'
            AND EXISTS (
              SELECT 1
              FROM jsonb_each(utp.taste_vector) AS taste_entry(key, value)
              WHERE jsonb_typeof(taste_entry.value) = 'number'
            )
          )
        ) AS is_complete
      FROM public.user_taste_profiles utp
    $view$;
  END IF;
END $$;
