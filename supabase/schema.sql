-- ROS 2 landing page: signups table + Row Level Security.
-- Run once in Supabase → SQL Editor (safe to re-run).
--
-- Security model:
--   * The browser uses the public anon / publishable key.
--   * anon may INSERT a row and nothing else: no SELECT, UPDATE or DELETE.
--   * anon may only write the columns listed in the GRANT below, so it can't
--     forge id or created_at.
--   * CHECK constraints reject junk even if someone bypasses the form.
--   * You read signups in the dashboard (Table Editor) or with the
--     service_role key on a server. Never put that key in the website.

create extension if not exists citext;

create table if not exists public.signups (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  name              text   not null check (char_length(btrim(name)) between 1 and 100),
  email             citext not null unique
                      check (char_length(email) <= 254
                             and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  ros2_experience   text   not null
                      check (ros2_experience in ('none', 'beginner', 'few_projects', 'professional')),
  bootcamp_interest boolean not null default false,
  source            text check (source is null or char_length(source) <= 64),
  user_agent        text check (user_agent is null or char_length(user_agent) <= 400)
);

comment on table public.signups is 'Cheatsheet downloads and bootcamp interest from the ROS 2 landing page.';

-- Lock it down.
alter table public.signups enable row level security;

revoke all on table public.signups from anon, authenticated;
grant insert (name, email, ros2_experience, bootcamp_interest, source, user_agent)
  on table public.signups to anon;

drop policy if exists "anon can insert signups" on public.signups;
create policy "anon can insert signups"
  on public.signups
  for insert
  to anon
  with check (true);  -- column CHECK constraints do the validation

-- No SELECT / UPDATE / DELETE policies exist, so anon can't read or change rows.

-- Handy view for you in the dashboard: how close is the bootcamp to 10?
create or replace view public.bootcamp_interest_count
  with (security_invoker = true) as
  select count(*) filter (where bootcamp_interest) as interested,
         count(*)                                   as total_signups
  from public.signups;
revoke all on public.bootcamp_interest_count from anon, authenticated;
