-- Fix RLS recursion for members table
-- Run this in Supabase SQL Editor after dropping existing policies

-- First, drop the problematic policies
drop policy if exists "members_select" on members;
drop policy if exists "members_insert" on members;
drop policy if exists "members_update" on members;

drop policy if exists "workspace_select" on workspaces;
drop policy if exists "tasks_select" on tasks;
drop policy if exists "checkins_select" on checkins;
drop policy if exists "checkins_insert" on checkins;
drop policy if exists "checkins_update" on checkins;
drop policy if exists "briefings_select" on briefings;

-- Create a security definer function to check workspace membership
-- This bypasses RLS to avoid recursion
create or replace function public.get_user_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from members where user_id = auth.uid()
  union
  select id from workspaces where owner_id = auth.uid()
$$;

-- Recreate workspace policies (simpler, no recursion)
create policy "workspace_select" on workspaces for select
  using (owner_id = auth.uid() or id in (select public.get_user_workspace_ids()));

-- Recreate members policies using the function
create policy "members_select" on members for select
  using (workspace_id in (select public.get_user_workspace_ids()));

create policy "members_insert" on members for insert
  with check (
    -- Owner can add members
    workspace_id in (select id from workspaces where owner_id = auth.uid())
    -- Or user adding themselves (for accepting invites)
    or user_id = auth.uid()
  );

create policy "members_update" on members for update
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

-- Recreate tasks policies
create policy "tasks_select" on tasks for select
  using (workspace_id in (select public.get_user_workspace_ids()));

-- Recreate checkins policies
create policy "checkins_select" on checkins for select
  using (workspace_id in (select public.get_user_workspace_ids()));

create policy "checkins_insert" on checkins for insert
  with check (
    workspace_id in (select public.get_user_workspace_ids())
    and member_id in (select id from members where user_id = auth.uid())
  );

create policy "checkins_update" on checkins for update
  using (member_id in (select id from members where user_id = auth.uid()));

-- Recreate briefings policies
create policy "briefings_select" on briefings for select
  using (workspace_id in (select public.get_user_workspace_ids()));
