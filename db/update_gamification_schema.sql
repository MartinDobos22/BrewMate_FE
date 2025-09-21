-- Rozšírenie gamifikačnej schémy o sezónne a bonusové polia
-- Skript je idempotentný a je bezpečné spúšťať ho viackrát.

-- Základná tabuľka pre stav gamifikácie používateľa
create table if not exists public.gamification_state_snapshots (
    user_id uuid primary key references auth.users(id) on delete cascade,
    total_xp integer not null default 0,
    level integer not null default 1,
    xp_to_next_level integer not null default 100,
    lifetime_points integer not null default 0,
    unclaimed_points integer not null default 0,
    streak_count integer not null default 0,
    longest_streak integer not null default 0,
    last_streak_reset_at timestamptz,
    last_updated_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb
);

alter table if exists public.gamification_state_snapshots
    add column if not exists season_id uuid,
    add column if not exists season_level integer not null default 1,
    add column if not exists season_xp integer not null default 0,
    add column if not exists season_points integer not null default 0,
    add column if not exists season_rank integer,
    add column if not exists season_tier text,
    add column if not exists season_bonus_multiplier numeric(4,2) not null default 1.0,
    add column if not exists season_bonus_expires_at timestamptz,
    add column if not exists season_xp_to_next_level integer not null default 100,
    add column if not exists boost_multiplier numeric(4,2) not null default 1.0,
    add column if not exists boost_expires_at timestamptz;

comment on column public.gamification_state_snapshots.season_id is 'Aktuálne aktívna sezóna pre používateľa';
comment on column public.gamification_state_snapshots.season_points is 'Sezónne body získané počas aktuálnej sezóny';
comment on column public.gamification_state_snapshots.season_bonus_multiplier is 'Multiplikátor bodov získaný počas dočasných bonusov';

-- Definícia denných questov
create table if not exists public.quest_definitions (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    title text not null,
    description text not null,
    category text not null default 'daily',
    rarity text not null default 'common',
    target_value integer not null default 1,
    reward_points integer not null default 0,
    reward_xp integer not null default 0,
    reward_items jsonb not null default '[]'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.daily_quest_instances (
    id uuid primary key default gen_random_uuid(),
    quest_definition_id uuid not null references public.quest_definitions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending',
    progress integer not null default 0,
    target integer not null default 1,
    reward_points integer not null default 0,
    reward_xp integer not null default 0,
    started_at timestamptz not null default now(),
    last_progress_at timestamptz not null default now(),
    available_from timestamptz not null default now(),
    expires_at timestamptz,
    completed_at timestamptz,
    claimed_at timestamptz,
    metadata jsonb not null default '{}'::jsonb
);

alter table if exists public.daily_quest_instances
    add column if not exists last_progress_at timestamptz not null default now(),
    add column if not exists season_id uuid,
    add column if not exists season_points integer not null default 0,
    add column if not exists boost_multiplier numeric(4,2) not null default 1.0,
    add column if not exists boost_expires_at timestamptz;

comment on column public.daily_quest_instances.season_points is 'Dodatočné sezónne body priradené za splnenie questu';
comment on column public.daily_quest_instances.boost_multiplier is 'Multiplikátor pokroku pre konkrétny quest';

-- Definície achievementov
create table if not exists public.achievement_definitions (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    title text not null,
    description text not null,
    category text not null default 'general',
    tier text not null default 'bronze',
    target_value integer not null default 1,
    reward_points integer not null default 0,
    reward_badge text,
    reward_items jsonb not null default '[]'::jsonb,
    is_secret boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table if exists public.achievement_definitions
    add column if not exists is_seasonal boolean not null default false,
    add column if not exists season_id uuid,
    add column if not exists reward_xp integer not null default 0,
    add column if not exists reward_currency jsonb not null default '{}'::jsonb;

comment on column public.achievement_definitions.is_seasonal is 'Určuje, či je achievement viazaný na konkrétnu sezónu';
comment on column public.achievement_definitions.reward_currency is 'Štruktúra bonusových odmien (napr. tokeny, kupóny)';

-- Prepojenie achievementov s používateľmi
create table if not exists public.user_achievements (
    id uuid primary key default gen_random_uuid(),
    achievement_id uuid not null references public.achievement_definitions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    progress integer not null default 0,
    target integer not null default 1,
    unlocked_at timestamptz,
    last_progress_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb,
    unique(achievement_id, user_id)
);

-- Pohľad kombinujúci stav používateľa so sezónnymi údajmi
create or replace view public.v_gamification_season_progress as
select
    s.user_id,
    s.total_xp,
    s.level,
    s.xp_to_next_level,
    s.lifetime_points,
    s.unclaimed_points,
    s.streak_count,
    s.longest_streak,
    s.last_streak_reset_at,
    s.season_id,
    s.season_level,
    s.season_xp,
    s.season_points,
    s.season_rank,
    s.season_tier,
    s.season_bonus_multiplier,
    s.season_bonus_expires_at,
    s.season_xp_to_next_level,
    s.boost_multiplier,
    s.boost_expires_at,
    s.last_updated_at,
    s.metadata
from public.gamification_state_snapshots s;

-- Pohľad s aktívnymi dennými questami vrátane rozšírených polí
create or replace view public.v_active_daily_quests as
select
    i.id,
    i.quest_definition_id,
    i.user_id,
    i.status,
    i.progress,
    i.target,
    i.reward_points,
    i.reward_xp,
    i.season_id,
    i.season_points,
    i.boost_multiplier,
    i.boost_expires_at,
    i.started_at,
    i.available_from,
    i.last_progress_at,
    i.expires_at,
    i.completed_at,
    i.claimed_at,
    i.metadata,
    q.title,
    q.description,
    q.category,
    q.rarity,
    q.reward_items as definition_reward_items,
    q.metadata as definition_metadata
from public.daily_quest_instances i
join public.quest_definitions q on q.id = i.quest_definition_id;

-- RPC funkcia na aktualizáciu stavu gamifikácie s novými poliami
create or replace function public.gamification_upsert_state(
    p_user_id uuid,
    p_total_xp integer default null,
    p_level integer default null,
    p_xp_to_next_level integer default null,
    p_lifetime_points integer default null,
    p_unclaimed_points integer default null,
    p_streak_count integer default null,
    p_longest_streak integer default null,
    p_last_streak_reset_at timestamptz default null,
    p_season_id uuid default null,
    p_season_level integer default null,
    p_season_xp integer default null,
    p_season_points integer default null,
    p_season_rank integer default null,
    p_season_tier text default null,
    p_season_bonus_multiplier numeric(4,2) default null,
    p_season_bonus_expires_at timestamptz default null,
    p_season_xp_to_next_level integer default null,
    p_boost_multiplier numeric(4,2) default null,
    p_boost_expires_at timestamptz default null,
    p_metadata jsonb default null
)
returns public.gamification_state_snapshots
language plpgsql
as $$
begin
    insert into public.gamification_state_snapshots as s (
        user_id,
        total_xp,
        level,
        xp_to_next_level,
        lifetime_points,
        unclaimed_points,
        streak_count,
        longest_streak,
        last_streak_reset_at,
        season_id,
        season_level,
        season_xp,
        season_points,
        season_rank,
        season_tier,
        season_bonus_multiplier,
        season_bonus_expires_at,
        season_xp_to_next_level,
        boost_multiplier,
        boost_expires_at,
        metadata,
        last_updated_at
    ) values (
        p_user_id,
        coalesce(p_total_xp, 0),
        coalesce(p_level, 1),
        coalesce(p_xp_to_next_level, 100),
        coalesce(p_lifetime_points, 0),
        coalesce(p_unclaimed_points, 0),
        coalesce(p_streak_count, 0),
        coalesce(p_longest_streak, 0),
        p_last_streak_reset_at,
        p_season_id,
        coalesce(p_season_level, 1),
        coalesce(p_season_xp, 0),
        coalesce(p_season_points, 0),
        p_season_rank,
        p_season_tier,
        coalesce(p_season_bonus_multiplier, 1.0),
        p_season_bonus_expires_at,
        coalesce(p_season_xp_to_next_level, 100),
        coalesce(p_boost_multiplier, 1.0),
        p_boost_expires_at,
        coalesce(p_metadata, '{}'::jsonb),
        now()
    )
    on conflict (user_id) do update set
        total_xp = coalesce(p_total_xp, s.total_xp),
        level = coalesce(p_level, s.level),
        xp_to_next_level = coalesce(p_xp_to_next_level, s.xp_to_next_level),
        lifetime_points = coalesce(p_lifetime_points, s.lifetime_points),
        unclaimed_points = coalesce(p_unclaimed_points, s.unclaimed_points),
        streak_count = coalesce(p_streak_count, s.streak_count),
        longest_streak = coalesce(p_longest_streak, s.longest_streak),
        last_streak_reset_at = coalesce(p_last_streak_reset_at, s.last_streak_reset_at),
        season_id = coalesce(p_season_id, s.season_id),
        season_level = coalesce(p_season_level, s.season_level),
        season_xp = coalesce(p_season_xp, s.season_xp),
        season_points = coalesce(p_season_points, s.season_points),
        season_rank = coalesce(p_season_rank, s.season_rank),
        season_tier = coalesce(p_season_tier, s.season_tier),
        season_bonus_multiplier = coalesce(p_season_bonus_multiplier, s.season_bonus_multiplier),
        season_bonus_expires_at = coalesce(p_season_bonus_expires_at, s.season_bonus_expires_at),
        season_xp_to_next_level = coalesce(p_season_xp_to_next_level, s.season_xp_to_next_level),
        boost_multiplier = coalesce(p_boost_multiplier, s.boost_multiplier),
        boost_expires_at = coalesce(p_boost_expires_at, s.boost_expires_at),
        metadata = coalesce(p_metadata, s.metadata),
        last_updated_at = now()
    returning *;
end;
$$;

-- Funkcia na zaznamenanie postupu v denných questoch s multiplikátorom
create or replace function public.gamification_apply_daily_quest_progress(
    p_instance_id uuid,
    p_increment integer default 1,
    p_boost_override numeric(4,2) default null
)
returns public.daily_quest_instances
language plpgsql
as $$
declare
    v_instance public.daily_quest_instances;
    v_multiplier numeric(4,2);
begin
    select * into v_instance from public.daily_quest_instances where id = p_instance_id for update;
    if not found then
        raise exception 'Quest instance % not found', p_instance_id;
    end if;

    if v_instance.status in ('completed', 'claimed', 'expired') then
        return v_instance;
    end if;

    v_multiplier := coalesce(p_boost_override, v_instance.boost_multiplier, 1.0);

    update public.daily_quest_instances
    set
        progress = least(v_instance.target, v_instance.progress + ceil(p_increment * v_multiplier)),
        status = case
            when least(v_instance.target, v_instance.progress + ceil(p_increment * v_multiplier)) >= v_instance.target then 'completed'
            else 'active'
        end,
        completed_at = case
            when least(v_instance.target, v_instance.progress + ceil(p_increment * v_multiplier)) >= v_instance.target then coalesce(v_instance.completed_at, now())
            else v_instance.completed_at
        end,
        last_progress_at = now()
    where id = p_instance_id
    returning * into v_instance;

    return v_instance;
end;
$$;
