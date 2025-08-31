create table if not exists brew_recipes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    method text not null,
    taste text,
    recipe text not null,
    created_at timestamptz default now()
);

create index if not exists brew_recipes_user_id_idx on brew_recipes(user_id);
