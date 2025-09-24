-- Gamifikačný systém - tabuľky a triggery
-- Komentáre v slovenčine podľa požiadavky

create table if not exists public.user_levels (
    user_id uuid primary key references auth.users(id) on delete cascade,
    current_level integer not null default 1 check (current_level between 1 and 50),
    current_xp integer not null default 0 check (current_xp >= 0),
    skill_points integer not null default 0 check (skill_points >= 0),
    skill_tree jsonb not null default '{}'::jsonb,
    combo_multiplier numeric(5,2) not null default 1.0,
    double_xp_until timestamptz,
    streak_days integer not null default 0,
    login_streak integer not null default 0,
    brew_streak integer not null default 0,
    perfect_week boolean not null default false,
    freeze_tokens integer not null default 1,
    updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    description text not null,
    category text not null check (category in ('beginner','skills','exploration','social','hidden','seasonal')),
    rarity text not null check (rarity in ('common','rare','epic','legendary')),
    thresholds integer[] not null default '{1}',
    special_reward jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
    user_id uuid references auth.users(id) on delete cascade,
    achievement_id uuid references public.achievements(id) on delete cascade,
    progress integer not null default 0,
    unlocked_at timestamptz,
    featured boolean not null default false,
    primary key (user_id, achievement_id)
);

create table if not exists public.daily_quests (
    id uuid primary key default gen_random_uuid(),
    template_id text,
    title text not null,
    description text not null,
    difficulty text not null check (difficulty in ('easy','medium','hard','special')),
    reward_xp integer not null,
    reward_skill_points integer not null default 0,
    requirements jsonb not null,
    active_from timestamptz not null,
    active_to timestamptz not null,
    created_at timestamptz not null default now()
);

create table if not exists public.user_daily_progress (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    daily_quest_id uuid references public.daily_quests(id) on delete cascade,
    progress jsonb not null default '{}'::jsonb,
    completed boolean not null default false,
    claimed boolean not null default false,
    updated_at timestamptz not null default now(),
    unique (user_id, daily_quest_id)
);

create table if not exists public.seasonal_events (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    theme text not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    bonus_multiplier numeric(4,2) not null default 1.0,
    featured_methods text[] not null default '{}',
    created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
    id bigserial primary key,
    name text not null,
    timestamp timestamptz not null,
    properties jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_user_levels_level on public.user_levels (current_level);
create index if not exists idx_user_achievements_user on public.user_achievements (user_id);
create index if not exists idx_daily_quests_window on public.daily_quests (active_from, active_to);
create index if not exists idx_user_daily_progress_user on public.user_daily_progress (user_id);

-- Trigger pre automatické aktualizácie timestampov
create or replace function public.touch_user_level()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_user_level
  before update on public.user_levels
  for each row execute function public.touch_user_level();

-- Trigger pre výpočet kombo násobiteľa podľa streaku
create or replace function public.recalculate_combo_multiplier()
returns trigger as $$
begin
  if new.streak_days is distinct from old.streak_days then
    new.combo_multiplier := least(3.0, 1.0 + (greatest(new.streak_days, 0) / 10.0));
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_recalculate_combo_multiplier
  before update on public.user_levels
  for each row execute function public.recalculate_combo_multiplier();

-- Pomocná view pre leaderboards
create or replace view public.gamification_leaderboard as
select
  ul.user_id,
  ul.current_level,
  ul.current_xp,
  ul.skill_points,
  ul.streak_days,
  sum(case when ua.unlocked_at is not null then 1 else 0 end) as unlocked_achievements
from public.user_levels ul
left join public.user_achievements ua on ua.user_id = ul.user_id
group by ul.user_id, ul.current_level, ul.current_xp, ul.skill_points, ul.streak_days;
