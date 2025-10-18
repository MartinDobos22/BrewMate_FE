-- Vytvorenie komplexného personalizačného systému pre BrewMate
-- Štruktúra rešpektuje Supabase (PostgreSQL) a používa referencie na auth.users

create table if not exists public.user_taste_profile (
    user_id uuid primary key references auth.users(id) on delete cascade,
    sweetness numeric(3,1) not null default 5 check (sweetness between 0 and 10),
    acidity numeric(3,1) not null default 5 check (acidity between 0 and 10),
    bitterness numeric(3,1) not null default 5 check (bitterness between 0 and 10),
    body numeric(3,1) not null default 5 check (body between 0 and 10),
    flavor_notes jsonb not null default '{}'::jsonb,
    milk_preferences jsonb not null default jsonb_build_object(
        'types', jsonb_build_array('plnotučné', 'ovsene'),
        'texture', 'krémová'
    ),
    caffeine_sensitivity text not null default 'medium',
    preferred_strength text not null default 'balanced',
    seasonal_adjustments jsonb not null default '{}'::jsonb,
    preference_confidence numeric(4,3) not null default 0.35 check (preference_confidence between 0 and 1),
    last_recalculated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.user_taste_profile is 'Primárny chuťový profil používateľa vytvorený algoritmom BrewMate';
comment on column public.user_taste_profile.flavor_notes is 'Váhované preferencie jednotlivých chuťových tónov (0-10)';
comment on column public.user_taste_profile.seasonal_adjustments is 'Sezónne korekcie chuťových preferencií podľa mesiaca/sezóny';

create index if not exists user_taste_profile_flavor_notes_idx on public.user_taste_profile using gin (flavor_notes);
create index if not exists user_taste_profile_updated_at_idx on public.user_taste_profile(updated_at);

create table if not exists public.brew_history (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    recipe_id uuid,
    beans jsonb not null default '{}'::jsonb,
    grind_size text,
    water_temp numeric(4,1),
    brew_time interval,
    rating integer not null check (rating between 1 and 5),
    taste_feedback jsonb not null default '{}'::jsonb,
    flavor_notes jsonb not null default '{}'::jsonb,
    context_time_of_day text,
    context_weather jsonb,
    mood_before text,
    mood_after text,
    modifications jsonb not null default '[]'::jsonb,
    repeated_from uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.brew_history is 'Detailná história príprav kávy vrátane spätnej väzby a kontextu';
comment on column public.brew_history.beans is 'Informácie o použitých zrnách (pôvod, praženie, dátum)';
comment on column public.brew_history.flavor_notes is 'Vnímané chuťové tóny počas prípravy';
comment on column public.brew_history.modifications is 'Záznam manuálnych úprav receptu';

create index if not exists brew_history_user_idx on public.brew_history(user_id, created_at desc);
create index if not exists brew_history_recipe_idx on public.brew_history(recipe_id);
create index if not exists brew_history_context_weather_idx on public.brew_history using gin (context_weather);

create table if not exists public.learning_events (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    brew_history_id bigint references public.brew_history(id) on delete cascade,
    event_type text not null check (event_type in ('liked', 'disliked', 'favorited', 'repeated', 'shared')),
    event_weight numeric(4,3) not null default 1.0,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

comment on table public.learning_events is 'Sledovanie všetkých interakcií používateľa pre potreby učenia';
comment on column public.learning_events.event_weight is 'Váha interakcie pre preferenčný algoritmus';

create index if not exists learning_events_user_idx on public.learning_events(user_id, created_at desc);
create index if not exists learning_events_type_idx on public.learning_events(event_type);
create index if not exists learning_events_metadata_idx on public.learning_events using gin (metadata);

-- Trigger pre aktualizáciu updated_at
create or replace function public.touch_user_taste_profile()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_user_taste_profile
    before update on public.user_taste_profile
    for each row execute function public.touch_user_taste_profile();

create or replace function public.touch_brew_history()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_brew_history
    before update on public.brew_history
    for each row execute function public.touch_brew_history();

create table if not exists public.user_onboarding_responses (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    answers jsonb not null,
    analyzed_profile jsonb,
    created_at timestamptz not null default now()
);

comment on table public.user_onboarding_responses is 'Surové odpovede používateľa z onboarding otázok vrátane AI analýzy chuťového profilu.';
comment on column public.user_onboarding_responses.answers is 'Zaznamenané odpovede na otázky vo forme JSON mapy.';
comment on column public.user_onboarding_responses.analyzed_profile is 'Výsledok AI analýzy chuťového profilu z onboarding odpovedí.';

create index if not exists user_onboarding_responses_user_idx on public.user_onboarding_responses(user_id, created_at desc);
