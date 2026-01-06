INSERT INTO app_users(firebase_uid)
SELECT DISTINCT user_id
FROM (
    SELECT user_id FROM user_taste_profiles
    UNION
    SELECT user_id FROM brew_history
    UNION
    SELECT user_id FROM learning_events
    UNION
    SELECT user_id FROM scan_events
    UNION
    SELECT user_id FROM user_coffees
    UNION
    SELECT user_id FROM user_recipes
    UNION
    SELECT user_id FROM user_statistics
) AS unique_user_ids
ON CONFLICT DO NOTHING;
