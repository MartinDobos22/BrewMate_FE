create table if not exists brew_recipes (
    id uuid primary key default gen_random_uuid(),
    -- Use text IDs to match Firebase UID format and link to user profiles
    user_id text references public.user_profiles(id) on delete cascade,
    method text not null,
    taste text,
    recipe text not null,
    created_at timestamptz default now()
);

create index if not exists brew_recipes_user_id_idx on brew_recipes(user_id);
