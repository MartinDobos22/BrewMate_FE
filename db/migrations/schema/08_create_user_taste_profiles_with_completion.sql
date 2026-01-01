-- Create view with completion marker for taste profiles.
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.user_taste_profiles_with_completion AS
      SELECT
        utp.*,
        (
          utp.preferred_strength IS NOT NULL
          AND (utp.sweetness IS NOT NULL OR utp.acidity IS NOT NULL)
          AND CASE
            WHEN utp.flavor_notes IS NULL THEN false
            WHEN jsonb_typeof(utp.flavor_notes) = 'array'
              THEN jsonb_array_length(utp.flavor_notes) > 0
            WHEN jsonb_typeof(utp.flavor_notes) = 'object'
              THEN EXISTS (
                SELECT 1
                FROM jsonb_object_keys(utp.flavor_notes)
                LIMIT 1
              )
            ELSE false
          END
        ) AS is_complete
      FROM public.user_taste_profiles utp
    $view$;
  END IF;
END $$;
