create table if not exists ocr_logs (
    id uuid primary key default gen_random_uuid(),
    -- Store Firebase UID directly as text
    user_id text not null,
    original_text text not null,
    corrected_text text not null,
    coffee_name text,
    brand text,
    match_percentage integer,
    is_recommended boolean,
    rating numeric,
    created_at timestamptz default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'ocr_logs'
      and column_name = 'user_id'
      and data_type <> 'text'
  ) then
    alter table ocr_logs
      drop constraint if exists ocr_logs_user_id_fkey,
      alter column user_id type text using user_id::text;
  end if;
end $$;

create index if not exists ocr_logs_user_id_idx on ocr_logs(user_id);
