-- TeamPulse Simplified Schema (No Workspaces)
-- Run this in Supabase SQL Editor to replace the workspace-based schema

-- Drop old tables if they exist (in correct order due to foreign keys)
drop table if exists briefings cascade;
drop table if exists checkins cascade;
drop table if exists invitations cascade;
drop table if exists tasks cascade;
drop table if exists members cascade;
drop table if exists workspaces cascade;

-- Drop old function
drop function if exists public.get_user_workspace_ids();

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'dev' check (role in ('lead', 'qa', 'dev')),
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks (shared across all users)
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  assignee_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  status text default 'active' check (status in ('active', 'pending', 'in_progress', 'blocked', 'in_qa', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  task_link text, -- External task link (Linear, Jira, Trello, etc.)
  linear_id text,
  github_pr_url text,
  estimated_days integer,
  pending_since date,
  blocked_since date,
  blocker_description text,
  qa_required boolean default true,
  qa_passed boolean,
  qa_checked_by uuid references profiles(id),
  qa_checked_at timestamptz,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EOD Check-ins (submitted by devs daily)
create table checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  tasks_completed jsonb default '[]',
  tasks_pending jsonb default '[]',
  has_blocker boolean default false,
  blocker_description text,
  blocker_task_id uuid references tasks(id),
  qa_checklist_done boolean,
  pr_submitted boolean,
  pr_urls text[],
  notes_for_lead text,
  mood integer check (mood between 1 and 5),
  submitted_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, checkin_date)
);

-- AI Briefings (generated daily)
create table briefings (
  id uuid primary key default uuid_generate_v4(),
  briefing_date date not null default current_date unique,
  content text not null,
  issues_found boolean default false,
  issues_summary jsonb default '[]',
  checkin_count integer default 0,
  member_count integer default 0,
  missing_checkins text[],
  generated_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table checkins enable row level security;
alter table briefings enable row level security;

-- RLS Policies for profiles
create policy "profiles_select" on profiles for select
  using (true); -- All authenticated users can see all profiles

create policy "profiles_insert" on profiles for insert
  with check (id = auth.uid());

create policy "profiles_update" on profiles for update
  using (id = auth.uid());

-- RLS Policies for tasks
create policy "tasks_select" on tasks for select
  using (true); -- All team members can see all tasks

create policy "tasks_insert" on tasks for insert
  with check (auth.uid() is not null);

create policy "tasks_update" on tasks for update
  using (auth.uid() is not null);

create policy "tasks_delete" on tasks for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'lead')
  );

-- RLS Policies for checkins
create policy "checkins_select" on checkins for select
  using (true); -- Leads can see all, devs see their own (handled in app)

create policy "checkins_insert" on checkins for insert
  with check (user_id = auth.uid());

create policy "checkins_update" on checkins for update
  using (user_id = auth.uid());

-- RLS Policies for briefings (only leads can see)
create policy "briefings_select" on briefings for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'lead'));

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply triggers
create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();

-- Function to handle new user signup (creates profile automatically)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'dev')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
