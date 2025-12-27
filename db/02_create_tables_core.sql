-- Creates core user tables.
-- Shadow users table for Firebase UID storage
CREATE TABLE public.app_users (
  id text PRIMARY KEY,
  email text UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Core taste profile maintained by personalization engine (App.tsx payloads)
CREATE TABLE public.user_taste_profile (
  user_id text PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
  sweetness numeric(4,2) NOT NULL DEFAULT 5 CHECK (sweetness BETWEEN 0 AND 10),
  acidity numeric(4,2) NOT NULL DEFAULT 5 CHECK (acidity BETWEEN 0 AND 10),
  bitterness numeric(4,2) NOT NULL DEFAULT 5 CHECK (bitterness BETWEEN 0 AND 10),
  body numeric(4,2) NOT NULL DEFAULT 5 CHECK (body BETWEEN 0 AND 10),
  flavor_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  milk_preferences jsonb NOT NULL DEFAULT jsonb_build_object('types', jsonb_build_array('plnotučné'), 'texture', 'krémová'),
  caffeine_sensitivity text NOT NULL DEFAULT 'medium' CHECK (caffeine_sensitivity IN ('low','medium','high')),
  preferred_strength text NOT NULL DEFAULT 'balanced' CHECK (preferred_strength IN ('light','balanced','strong')),
  seasonal_adjustments jsonb NOT NULL DEFAULT '[]'::jsonb,
  preference_confidence numeric(4,3) NOT NULL DEFAULT 0.35 CHECK (preference_confidence BETWEEN 0 AND 1),
  last_recalculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Core taste profile maintained by personalization engine
CREATE TABLE public.user_taste_profiles (
  user_id text PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
  sweetness numeric(4,2) NOT NULL DEFAULT 5 CHECK (sweetness BETWEEN 0 AND 10),
  acidity numeric(4,2) NOT NULL DEFAULT 5 CHECK (acidity BETWEEN 0 AND 10),
  bitterness numeric(4,2) NOT NULL DEFAULT 5 CHECK (bitterness BETWEEN 0 AND 10),
  body numeric(4,2) NOT NULL DEFAULT 5 CHECK (body BETWEEN 0 AND 10),
  flavor_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  milk_preferences jsonb NOT NULL DEFAULT jsonb_build_object('types', jsonb_build_array('plnotučné'), 'texture', 'krémová'),
  caffeine_sensitivity text NOT NULL DEFAULT 'medium' CHECK (caffeine_sensitivity IN ('low','medium','high')),
  preferred_strength text NOT NULL DEFAULT 'balanced' CHECK (preferred_strength IN ('light','balanced','strong')),
  seasonal_adjustments jsonb NOT NULL DEFAULT '[]'::jsonb,
  preference_confidence numeric(4,3) NOT NULL DEFAULT 0.35 CHECK (preference_confidence BETWEEN 0 AND 1),
  quiz_version text,
  quiz_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  taste_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  consistency_score numeric(4,3) NOT NULL DEFAULT 1,
  ai_recommendation text,
  manual_input text,
  last_recalculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
