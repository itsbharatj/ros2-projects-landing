-- ROS 2 cheat sheet landing page: sign-ups.
-- Paste this whole file into the Supabase SQL editor and run it. Safe to run more than once,
-- and safe to run on top of the earlier version of this file (it migrates that table in place).
--
-- How it stays safe with a public (anon / publishable) key on a static site:
--   * The table has row level security on and NO policies for anon/authenticated, and every
--     table privilege is revoked from them. Visitors cannot read, change or delete rows, even
--     with the key in hand.
--   * The only thing the key can do is call submit_signup(), which validates the input, drops
--     bot submissions (honeypot field), limits submissions per visitor (5 an hour) and writes
--     the row with the function owner's rights.
--   * You read the data in the Table editor or export it as CSV; the service_role key never
--     leaves the dashboard.

-- 0. Migrate the table from the first version of this repo, if it is there (no rows are lost).
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'signups' and column_name = 'ros2_experience') then
    drop view if exists public.bootcamp_interest_count;
    drop policy if exists "anon can insert signups" on public.signups;
    alter table public.signups rename column ros2_experience to experience;
    alter table public.signups rename column bootcamp_interest to workshop;
    alter table public.signups drop constraint if exists signups_ros2_experience_check;
    alter table public.signups drop constraint if exists signups_source_check;
    alter table public.signups drop column if exists user_agent;
    update public.signups set experience = case experience
      when 'none' then 'new' when 'beginner' then 'tutorials'
      when 'few_projects' then 'project' when 'professional' then 'work' else experience end;
  end if;
end $$;

-- 1. The table.
create table if not exists public.signups (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  name          text not null check (char_length(name) between 1 and 80),
  email         text not null unique
                check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  experience    text not null,
  workshop      boolean not null default false,          -- wants to hear about the live workshop
  source        text,                                    -- page path or ?ref=..., for your own curiosity
  submissions   integer not null default 1,              -- how many times this email sent the form
  ip_hash       text                                     -- salted hash, only for rate limiting
);
alter table public.signups add column if not exists updated_at  timestamptz not null default now();
alter table public.signups add column if not exists submissions integer not null default 1;
alter table public.signups add column if not exists ip_hash     text;
alter table public.signups drop constraint if exists signups_experience_check;
alter table public.signups add constraint signups_experience_check
  check (experience in ('new', 'tutorials', 'project', 'work'));
alter table public.signups drop constraint if exists signups_source_check;
alter table public.signups add constraint signups_source_check check (source is null or char_length(source) <= 200);

comment on table public.signups is 'People who downloaded the ROS 2 cheat sheet; workshop = wants to hear about the free live workshop.';

-- 2. Lock it down. No policies on purpose: only you (dashboard) and the service role can read.
alter table public.signups enable row level security;
revoke all on table public.signups from anon, authenticated;
revoke all on sequence public.signups_id_seq from anon, authenticated;

-- 3. The one door: a function that validates and writes with the owner's rights.
create or replace function public.submit_signup(
  p_name        text,
  p_email       text,
  p_experience  text,
  p_workshop    boolean default false,
  p_source      text default null,
  p_website     text default null       -- honeypot field; humans leave it empty
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_headers json;
  v_ip      text;
  v_hash    text;
  v_recent  integer;
begin
  -- Bots fill the hidden field. Pretend it worked and store nothing.
  if coalesce(p_website, '') <> '' then
    return;
  end if;

  -- Rate limit per visitor: 5 submissions an hour. The IP is hashed with a salt and never
  -- stored in clear. Change the salt to anything you like.
  begin
    v_headers := current_setting('request.headers', true)::json;
    v_ip := split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', ''), ',', 1);
  exception when others then
    v_ip := '';
  end;
  if v_ip <> '' then
    v_hash := md5(v_ip || ':ros2-sheet-change-this-salt');
    select count(*) into v_recent
      from public.signups
     where ip_hash = v_hash and updated_at > now() - interval '1 hour';
    if v_recent >= 5 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  insert into public.signups (name, email, experience, workshop, source, ip_hash)
  values (btrim(p_name), lower(btrim(p_email)), p_experience, coalesce(p_workshop, false), left(p_source, 200), v_hash)
  on conflict (email) do update
     set name        = excluded.name,
         experience  = excluded.experience,
         workshop    = public.signups.workshop or excluded.workshop,   -- never un-tick someone
         source      = coalesce(excluded.source, public.signups.source),
         submissions = public.signups.submissions + 1,
         updated_at  = now(),
         ip_hash     = coalesce(excluded.ip_hash, public.signups.ip_hash);
end
$$;

revoke all on function public.submit_signup(text, text, text, boolean, text, text) from public;
grant execute on function public.submit_signup(text, text, text, boolean, text, text) to anon, authenticated;

-- 4. Handy views for you (dashboard only; not reachable with the public key).
create or replace view public.workshop_list as
  select name, email, experience, created_at
    from public.signups
   where workshop
   order by created_at;
revoke all on public.workshop_list from anon, authenticated;

create or replace view public.signup_counts as
  select count(*)                          as total,
         count(*) filter (where workshop)  as want_the_workshop
    from public.signups;
revoke all on public.signup_counts from anon, authenticated;
