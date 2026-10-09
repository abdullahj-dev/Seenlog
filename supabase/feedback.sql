-- Feedback, complaints, ideas and missing-title requests. Run supabase/admin.sql first. Safe to run more than once.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  kind text not null check (kind in ('bug', 'idea', 'complaint', 'missing', 'other')),
  body text not null check (char_length(body) between 3 and 2000),
  title_data jsonb check (title_data is null or pg_column_size(title_data) < 2000),
  status text not null default 'new' check (status in ('new', 'seen', 'planned', 'done', 'declined')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_idx on public.feedback (status, created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);
alter table public.feedback enable row level security;

-- Whatever the browser sends, the server decides who sent it, the status and the timestamps.
create or replace function public.feedback_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in to send feedback'; end if;
  if (select count(*) from public.feedback where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many messages. Try again in an hour';
  end if;
  new.user_id := auth.uid();
  new.email := (select email from auth.users where id = auth.uid());
  new.status := 'new'; new.admin_note := null;
  new.created_at := now(); new.updated_at := now();
  return new;
end $$;
drop trigger if exists feedback_before_insert on public.feedback;
create trigger feedback_before_insert before insert on public.feedback for each row execute function public.feedback_before_insert();

drop policy if exists "feedback send" on public.feedback;
create policy "feedback send" on public.feedback for insert to authenticated with check (true);
drop policy if exists "feedback read own" on public.feedback;
create policy "feedback read own" on public.feedback for select to authenticated using (user_id = auth.uid());
drop policy if exists "feedback admin read" on public.feedback;
create policy "feedback admin read" on public.feedback for select to authenticated using (public.is_admin());
drop policy if exists "feedback admin update" on public.feedback;
create policy "feedback admin update" on public.feedback for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "feedback admin delete" on public.feedback;
create policy "feedback admin delete" on public.feedback for delete to authenticated using (public.is_admin());
