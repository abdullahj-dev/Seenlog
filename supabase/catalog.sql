-- Shared catalog: titles you approve show up in everyone's search. Run after admin.sql. Safe to run more than once.
create table if not exists public.catalog (
  key text primary key,
  kind text not null check (kind in ('movie', 'series', 'anime')),
  title text not null check (char_length(title) between 1 and 140),
  year text check (year is null or year ~ '^[0-9]{4}$'),
  lang text,
  poster text,
  overview text check (overview is null or char_length(overview) <= 600),
  genres text[] not null default '{}',
  director text,
  cast_names text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.catalog enable row level security;
drop policy if exists "catalog read" on public.catalog;
create policy "catalog read" on public.catalog for select using (true);
drop policy if exists "catalog admin insert" on public.catalog;
create policy "catalog admin insert" on public.catalog for insert to authenticated with check (public.is_admin());
drop policy if exists "catalog admin update" on public.catalog;
create policy "catalog admin update" on public.catalog for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "catalog admin delete" on public.catalog;
create policy "catalog admin delete" on public.catalog for delete to authenticated using (public.is_admin());
