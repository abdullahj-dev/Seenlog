-- Seenlog database. Paste this whole file into Supabase > SQL Editor > Run.
-- Safe to run again: it only adds what is missing and rebuilds the public views.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists share_reviews boolean not null default false;
alter table public.profiles add column if not exists is_featured boolean not null default false;
alter table public.profiles add column if not exists public_cols text[] not null default '{}';
alter table public.profiles add column if not exists rating_mode text not null default '10'
  check (rating_mode in ('10', '100', '5', 'smiley'));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'username_format') then
    alter table public.profiles add constraint username_format check (username ~ '^[a-z0-9_]{3,20}$');
  end if;
end $$;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.profiles enable row level security;
alter table public.entries enable row level security;

drop policy if exists "own profile" on public.profiles;
drop policy if exists "public profiles readable" on public.profiles;
drop policy if exists "own entries" on public.entries;
drop policy if exists "public entries readable" on public.entries;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "public profiles readable" on public.profiles for select using (is_public);
create policy "own entries" on public.entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Public views: the ONLY way other people can read anything. They expose safe fields and honour the sharing switches.
drop view if exists public.public_entries;
create view public.public_entries as
select e.user_id, e.key,
  jsonb_build_object(
    'title', e.data->'title', 'year', e.data->'year', 'poster', e.data->'poster',
    'kind', e.data->'kind', 'status', e.data->'status', 'rating', e.data->'rating',
    'genres', e.data->'genres', 'added', e.data->'added',
    'notes', case when p.share_reviews and coalesce((e.data->>'lock')::boolean, false) = false then e.data->'notes' end
  ) as data
from public.entries e join public.profiles p on p.id = e.user_id
where p.is_public;

drop view if exists public.public_profiles;
create view public.public_profiles as
select p.username, p.is_featured, count(e.key) as titles,
  round(avg((e.data->>'rating')::numeric) / 10, 1) as avg_rating
from public.profiles p left join public.entries e on e.user_id = p.id
where p.is_public and p.username is not null
group by p.id;

drop view if exists public.public_reviews;
create view public.public_reviews as
select p.username, e.key, e.data->>'title' as title, e.data->>'year' as year,
  e.data->>'poster' as poster, e.data->>'kind' as kind,
  (e.data->>'rating')::numeric as rating, e.data->>'notes' as note, (e.data->>'added')::bigint as added
from public.entries e join public.profiles p on p.id = e.user_id
where p.is_public and p.share_reviews
  and coalesce(e.data->>'notes', '') <> '' and coalesce((e.data->>'lock')::boolean, false) = false;

drop view if exists public.public_collections;
create view public.public_collections as
select p.username, c.name as collection, e.key,
  jsonb_build_object(
    'title', e.data->'title', 'year', e.data->'year', 'poster', e.data->'poster',
    'kind', e.data->'kind', 'status', e.data->'status', 'rating', e.data->'rating',
    'genres', e.data->'genres', 'added', e.data->'added'
  ) as data
from public.entries e
join public.profiles p on p.id = e.user_id
cross join lateral jsonb_array_elements_text(coalesce(e.data->'cols', '[]'::jsonb)) as c(name)
where p.username is not null and c.name = any(p.public_cols);

grant select on public.public_entries, public.public_profiles, public.public_reviews, public.public_collections to anon, authenticated;
