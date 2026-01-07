-- Recreate view with explicit completion marker for taste profiles.
DO $$ BEGIN
  IF to_regclass('public.user_taste_profiles') IS NOT NULL THEN
    EXECUTE $view$
      DROP VIEW IF EXISTS public.user_taste_profiles_with_completion;
      CREATE VIEW public.user_taste_profiles_with_completion AS
      SELECT
        utp.user_id,
        utp.sweetness,
        utp.acidity,
        utp.bitterness,
        utp.body,
        utp.flavor_notes,
        utp.milk_preferences,
        utp.caffeine_sensitivity,
        utp.preferred_strength,
        utp.seasonal_adjustments,
        utp.preference_confidence,
        utp.quiz_version,
        utp.quiz_answers,
        utp.taste_vector,
        utp.consistency_score,
        utp.ai_recommendation,
        utp.manual_input,
        utp.last_recalculated_at,
        utp.created_at,
        utp.updated_at,
        (
          COALESCE(utp.is_complete, false)
          OR
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
              AND jsonb_typeof(utp.taste_vector->'sweetness') = 'number'
              AND jsonb_typeof(utp.taste_vector->'acidity') = 'number'
              AND jsonb_typeof(utp.taste_vector->'bitterness') = 'number'
              AND jsonb_typeof(utp.taste_vector->'body') = 'number'
              AND (utp.taste_vector->>'sweetness')::numeric BETWEEN 0 AND 10
              AND (utp.taste_vector->>'acidity')::numeric BETWEEN 0 AND 10
              AND (utp.taste_vector->>'bitterness')::numeric BETWEEN 0 AND 10
              AND (utp.taste_vector->>'body')::numeric BETWEEN 0 AND 10
            )
          )
        ) AS is_complete
      FROM public.user_taste_profiles utp
    $view$;
  END IF;
END $$;
