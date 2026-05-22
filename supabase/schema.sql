-- =====================================================
-- Golf Practice OS — Supabase Schema
-- Run this in the Supabase SQL Editor (or via migrations)
-- =====================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- Main table for all practice activity
create table if not exists public.practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,

  type text not null check (type in ('block', 'random', 'mixed', 'game', 'planned')),
  title text not null,

  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer,

  balls_used integer,
  overall_feel integer check (overall_feel between 1 and 5),

  notes text,
  reflection jsonb,           -- { well, improve, energy, focus, replayDone }
  config jsonb,               -- Full snapshot: drills, scores, game data, etc.
  score numeric,              -- For games that have a numeric score

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast user queries
create index if not exists practice_sessions_user_id_idx 
  on public.practice_sessions (user_id, started_at desc);

-- Row Level Security
alter table public.practice_sessions enable row level security;

-- Policies
create policy "Users can view their own sessions"
  on public.practice_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.practice_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.practice_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.practice_sessions for delete
  using (auth.uid() = user_id);

-- Optional: simple updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger practice_sessions_updated_at
  before update on public.practice_sessions
  for each row execute procedure public.handle_updated_at();

-- =====================================================
-- Recommended: Create a profiles table (standard pattern)
-- =====================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup (optional but recommended)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
