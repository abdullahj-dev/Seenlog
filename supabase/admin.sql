-- Admin system, stage 1: who is an admin, and what an admin can see and do.
-- Safe to run more than once. Supabase dashboard > SQL Editor > paste > Run.
-- STEP 1: change the email on the "first admin" line below to the email you signed up with.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admin reads own row" on public.admins;
create policy "admin reads own row" on public.admins for select using (user_id = auth.uid());
-- No insert, update or delete policy exists, so nobody can make themselves admin from the website.
-- Admins are added only here, in the SQL editor.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- First admin. EDIT THE EMAIL.
insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('ShadowCrimsonOfficial@gmail.com')
on conflict do nothing;

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return json_build_object(
    'users',       (select count(*) from auth.users),
    'new_7d',      (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'public',      (select count(*) from public.profiles where is_public),
    'featured',    (select count(*) from public.profiles where is_featured),
    'titles',      (select count(*) from public.entries),
    'custom',      (select count(*) from public.entries where key like 'cu%'),
    'movies',      (select count(*) from public.entries where data->>'kind' = 'movie'),
    'series',      (select count(*) from public.entries where data->>'kind' = 'series'),
    'anime',       (select count(*) from public.entries where data->>'kind' = 'anime')
  );
end $$;

create or replace function public.admin_users()
returns table (id uuid, email text, username text, is_public boolean, is_featured boolean, entries bigint, joined timestamptz, last_seen timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select u.id, u.email::text, p.username, coalesce(p.is_public, false), coalesce(p.is_featured, false),
           (select count(*) from public.entries e where e.user_id = u.id), u.created_at, u.last_sign_in_at
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end $$;

create or replace function public.admin_set_profile(uid uuid, featured boolean, visible boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.profiles set is_featured = featured, is_public = visible where id = uid;
end $$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_users() from public, anon;
revoke all on function public.admin_set_profile(uuid, boolean, boolean) from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.admin_set_profile(uuid, boolean, boolean) to authenticated;
