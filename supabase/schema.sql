-- ============================================================================
-- PANORAMA Database Schema
-- Production PostgreSQL schema for Supabase with Row Level Security (RLS)
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE & SIGNUP TRIGGER
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_user_isolation" on public.profiles;
create policy "profiles_user_isolation" on public.profiles
  for all
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create index if not exists idx_profiles_id on public.profiles(id);

-- Trigger to automatically create profile on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Drop existing trigger if re-running
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 2. USER SETTINGS TABLE
-- ============================================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  accent text not null default '#2563EB',
  default_minutes int not null default 120 check (default_minutes >= 10 and default_minutes <= 720),
  created_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_isolation" on public.user_settings;
create policy "user_settings_isolation" on public.user_settings
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists idx_user_settings_user_id on public.user_settings(user_id);

-- ============================================================================
-- 3. SUBJECTS TABLE
-- ============================================================================
create table if not exists public.subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

drop policy if exists "subjects_user_isolation" on public.subjects;
create policy "subjects_user_isolation" on public.subjects
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists idx_subjects_user_id on public.subjects(user_id);

-- ============================================================================
-- 4. TOPICS TABLE
-- ============================================================================
create table if not exists public.topics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')) default 'medium',
  created_at timestamptz not null default now()
);

alter table public.topics enable row level security;

drop policy if exists "topics_user_isolation" on public.topics;
create policy "topics_user_isolation" on public.topics
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists idx_topics_user_id on public.topics(user_id);
create index if not exists idx_topics_subject_id on public.topics(subject_id);

-- ============================================================================
-- 5. TASKS TABLE
-- ============================================================================
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  type text not null check (type in ('assignment', 'quiz', 'revision', 'practice')),
  due_date date not null,
  est_min int not null check (est_min > 0),
  importance text not null check (importance in ('high', 'medium', 'low')),
  status text not null check (status in ('pending', 'done')) default 'pending',
  steps jsonb default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists "tasks_user_isolation" on public.tasks;
create policy "tasks_user_isolation" on public.tasks
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_subject_id on public.tasks(subject_id);
create index if not exists idx_tasks_topic_id on public.tasks(topic_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);

-- ============================================================================
-- 6. STUDY SESSIONS TABLE
-- ============================================================================
create table if not exists public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  session_date date not null default current_date,
  minutes int not null check (minutes > 0),
  created_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;

drop policy if exists "study_sessions_user_isolation" on public.study_sessions;
create policy "study_sessions_user_isolation" on public.study_sessions
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists idx_study_sessions_user_id on public.study_sessions(user_id);
create index if not exists idx_study_sessions_task_id on public.study_sessions(task_id);
