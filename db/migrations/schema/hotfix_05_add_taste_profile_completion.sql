-- Add a convenience view to expose taste profile completion status.
CREATE OR REPLACE VIEW public.user_taste_profiles_with_completion AS
SELECT
  utp.*,
  (
    utp.quiz_version IS NOT NULL
    AND jsonb_typeof(utp.quiz_answers) = 'object'
    AND jsonb_object_length(utp.quiz_answers) > 0
    AND jsonb_typeof(utp.taste_vector) = 'object'
    AND utp.taste_vector ?& ARRAY[
      'sweetness',
      'acidity',
      'bitterness',
      'body',
      'intensity',
      'experimentalism'
    ]
  ) AS is_complete
FROM public.user_taste_profiles utp;
