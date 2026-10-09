-- Announcements: admins post a notice, everyone sees it as a banner. Run after admin.sql. Safe to run more than once.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text check (body is null or char_length(body) <= 400),
  link text check (link is null or (char_length(link) <= 300 and link ~ '^(https://|/)')),
  level text not null default 'info' check (level in ('info', 'good', 'warn')),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
drop policy if exists "announce read" on public.announcements;
create policy "announce read" on public.announcements for select using ((active and (expires_at is null or expires_at > now())) or public.is_admin());
drop policy if exists "announce admin insert" on public.announcements;
create policy "announce admin insert" on public.announcements for insert to authenticated with check (public.is_admin());
drop policy if exists "announce admin update" on public.announcements;
create policy "announce admin update" on public.announcements for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "announce admin delete" on public.announcements;
create policy "announce admin delete" on public.announcements for delete to authenticated using (public.is_admin());
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
