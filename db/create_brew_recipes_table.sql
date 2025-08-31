create table if not exists brew_recipes (
    id uuid primary key default gen_random_uuid(),
    -- Store Firebase UID directly as text
    user_id text not null,
    method text not null,
    taste text,
    recipe text not null,
    created_at timestamptz default now()
);

-- Ensure existing installations store user IDs as text instead of UUID
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'brew_recipes'
      and column_name = 'user_id'
      and data_type <> 'text'
  ) then
    alter table brew_recipes
      drop constraint if exists brew_recipes_user_id_fkey,
      alter column user_id type text using user_id::text;
  end if;
end $$;

create index if not exists brew_recipes_user_id_idx on brew_recipes(user_id);
