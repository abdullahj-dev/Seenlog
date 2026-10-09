-- Account deletion, profile reports and suspension. Run after admin.sql and feedback.sql. Safe to run more than once.

-- 1. A person can delete their own account and everything in it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.admins where user_id = uid) then
    raise exception 'Admin accounts must be removed from the admins table first';
  end if;
  delete from public.entries where user_id = uid;
  delete from public.feedback where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 2. Feedback gets a "report" kind, and suspended people cannot send feedback.
alter table public.feedback drop constraint if exists feedback_kind_check;
alter table public.feedback add constraint feedback_kind_check check (kind in ('bug', 'idea', 'complaint', 'missing', 'other', 'report'));

create or replace function public.feedback_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in to send feedback'; end if;
  if exists (select 1 from auth.users where id = auth.uid() and banned_until is not null and banned_until > now()) then
    raise exception 'This account is suspended';
  end if;
  if (select count(*) from public.feedback where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many messages. Try again in an hour';
  end if;
  new.user_id := auth.uid();
  new.email := (select email from auth.users where id = auth.uid());
  new.status := 'new'; new.admin_note := null;
  new.created_at := now(); new.updated_at := now();
  return new;
end $$;

-- 3. Suspend or restore a person (admin only). A suspended person cannot sign in and their public page is switched off.
create or replace function public.admin_suspend(uid uuid, suspend boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if uid = auth.uid() then raise exception 'You cannot suspend yourself'; end if;
  if exists (select 1 from public.admins where user_id = uid) then raise exception 'Remove admin rights first'; end if;
  update auth.users set banned_until = case when suspend then now() + interval '100 years' else null end where id = uid;
  if suspend then update public.profiles set is_public = false, is_featured = false where id = uid; end if;
end $$;
revoke all on function public.admin_suspend(uuid, boolean) from public, anon;
grant execute on function public.admin_suspend(uuid, boolean) to authenticated;

-- 4. The People list also says who is suspended.
drop function if exists public.admin_users();
create function public.admin_users()
returns table (id uuid, email text, username text, is_public boolean, is_featured boolean, entries bigint, joined timestamptz, last_seen timestamptz, suspended boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select u.id, u.email::text, p.username, coalesce(p.is_public, false), coalesce(p.is_featured, false),
           (select count(*) from public.entries e where e.user_id = u.id), u.created_at, u.last_sign_in_at,
           (u.banned_until is not null and u.banned_until > now())
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;
