-- TeamPulse Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Workspaces (one per paying customer / team)
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  owner_id uuid references auth.users(id) on delete cascade,
  telegram_chat_id text,
  telegram_enabled boolean default false,
  email_enabled boolean default true,
  checkin_reminder_time time default '18:00',
  briefing_time time default '09:00',
  plan text default 'free' check (plan in ('free', 'pro')),
  lemon_squeezy_customer_id text,
  lemon_squeezy_subscription_id text,
  subscription_status text default 'inactive',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Members (users belonging to a workspace)
create table members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'dev' check (role in ('lead', 'dev', 'qa')),
  avatar_url text,
  is_active boolean default true,
  invited_by uuid references auth.users(id),
  joined_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Tasks (ongoing task registry per workspace)
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  assignee_id uuid references members(id) on delete set null,
  title text not null,
  description text,
  status text default 'active' check (status in ('active', 'pending', 'in_progress', 'blocked', 'in_qa', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  linear_id text,
  github_pr_url text,
  estimated_days integer,
  pending_since date,
  blocked_since date,
  blocker_description text,
  qa_required boolean default true,
  qa_passed boolean,
  qa_checked_by uuid references members(id),
  qa_checked_at timestamptz,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EOD Check-ins (submitted by devs daily)
create table checkins (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
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
  unique(workspace_id, member_id, checkin_date)
);

-- AI Briefings (generated daily per workspace)
create table briefings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  briefing_date date not null default current_date,
  content text not null,
  issues_found boolean default false,
  issues_summary jsonb default '[]',
  checkin_count integer default 0,
  member_count integer default 0,
  missing_checkins text[],
  telegram_sent boolean default false,
  email_sent boolean default false,
  generated_at timestamptz default now(),
  unique(workspace_id, briefing_date)
);

-- Invitations (pending invites)
create table invitations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  email text not null,
  role text default 'dev' check (role in ('lead', 'dev', 'qa')),
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table workspaces enable row level security;
alter table members enable row level security;
alter table tasks enable row level security;
alter table checkins enable row level security;
alter table briefings enable row level security;
alter table invitations enable row level security;

-- RLS Policies for workspaces
create policy "workspace_select" on workspaces for select
  using (owner_id = auth.uid() or id in (
    select workspace_id from members where user_id = auth.uid()
  ));

create policy "workspace_insert" on workspaces for insert
  with check (owner_id = auth.uid());

create policy "workspace_update" on workspaces for update
  using (owner_id = auth.uid());

-- RLS Policies for members
create policy "members_select" on members for select
  using (workspace_id in (
    select workspace_id from members where user_id = auth.uid()
  ) or workspace_id in (
    select id from workspaces where owner_id = auth.uid()
  ));

create policy "members_insert" on members for insert
  with check (workspace_id in (
    select id from workspaces where owner_id = auth.uid()
  ) or user_id = auth.uid());

create policy "members_update" on members for update
  using (workspace_id in (
    select id from workspaces where owner_id = auth.uid()
  ));

-- RLS Policies for tasks
create policy "tasks_select" on tasks for select
  using (workspace_id in (
    select workspace_id from members where user_id = auth.uid()
  ));

create policy "tasks_insert" on tasks for insert
  with check (workspace_id in (
    select workspace_id from members where user_id = auth.uid()
  ));

create policy "tasks_update" on tasks for update
  using (workspace_id in (
    select workspace_id from members where user_id = auth.uid()
  ));

create policy "tasks_delete" on tasks for delete
  using (workspace_id in (
    select id from workspaces where owner_id = auth.uid()
  ));

-- RLS Policies for checkins
create policy "checkins_select" on checkins for select
  using (workspace_id in (
    select workspace_id from members where user_id = auth.uid()
  ));

create policy "checkins_insert" on checkins for insert
  with check (member_id in (
    select id from members where user_id = auth.uid()
  ));

create policy "checkins_update" on checkins for update
  using (member_id in (
    select id from members where user_id = auth.uid()
  ));

-- RLS Policies for briefings
create policy "briefings_select" on briefings for select
  using (workspace_id in (
    select workspace_id from members where user_id = auth.uid()
  ));

-- RLS Policies for invitations
create policy "invitations_select" on invitations for select
  using (workspace_id in (
    select id from workspaces where owner_id = auth.uid()
  ) or email = auth.email());

create policy "invitations_insert" on invitations for insert
  with check (workspace_id in (
    select id from workspaces where owner_id = auth.uid()
  ));

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply triggers
create trigger workspaces_updated_at before update on workspaces
  for each row execute function update_updated_at();

create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();
