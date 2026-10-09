-- Follow, followers, and hearts or broken hearts on public profiles. Run after admin.sql and safety.sql. Safe to run more than once.

create table if not exists public.follows (
  follower uuid not null default auth.uid() references auth.users(id) on delete cascade,
  followee uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee_idx on public.follows (followee);
alter table public.follows enable row level security;
drop policy if exists "follows read mine" on public.follows;
create policy "follows read mine" on public.follows for select to authenticated using (follower = auth.uid() or followee = auth.uid());
drop policy if exists "follows add" on public.follows;
create policy "follows add" on public.follows for insert to authenticated with check (follower = auth.uid());
drop policy if exists "follows remove" on public.follows;
create policy "follows remove" on public.follows for delete to authenticated using (follower = auth.uid());

create table if not exists public.profile_votes (
  voter uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target uuid not null references auth.users(id) on delete cascade,
  vote smallint not null check (vote in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (voter, target),
  check (voter <> target)
);
create index if not exists profile_votes_target_idx on public.profile_votes (target);
alter table public.profile_votes enable row level security;
drop policy if exists "votes read mine" on public.profile_votes;
create policy "votes read mine" on public.profile_votes for select to authenticated using (voter = auth.uid());
drop policy if exists "votes add" on public.profile_votes;
create policy "votes add" on public.profile_votes for insert to authenticated with check (voter = auth.uid());
drop policy if exists "votes change" on public.profile_votes;
create policy "votes change" on public.profile_votes for update to authenticated using (voter = auth.uid()) with check (voter = auth.uid());
drop policy if exists "votes remove" on public.profile_votes;
create policy "votes remove" on public.profile_votes for delete to authenticated using (voter = auth.uid());

-- Guard rails: only public profiles can be followed or voted on, suspended people cannot, and there are limits.
create or replace function public.social_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare tgt uuid; me uuid := auth.uid(); n int;
begin
  if me is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from auth.users where id = me and banned_until is not null and banned_until > now()) then raise exception 'This account is suspended'; end if;
  if tg_table_name = 'follows' then tgt := new.followee; else tgt := new.target; end if;
  if not exists (select 1 from public.profiles where id = tgt and is_public and username is not null) then raise exception 'That profile is not public'; end if;
  if tg_table_name = 'follows' then
    select count(*) into n from public.follows where follower = me;
    if n >= 500 then raise exception 'You follow the maximum of 500 people'; end if;
    select count(*) into n from public.follows where follower = me and created_at > now() - interval '1 hour';
    if n >= 60 then raise exception 'Slow down, try again in a while'; end if;
  else
    select count(*) into n from public.profile_votes where voter = me and created_at > now() - interval '1 hour';
    if n >= 60 then raise exception 'Slow down, try again in a while'; end if;
  end if;
  return new;
end $$;
drop trigger if exists follows_guard on public.follows;
create trigger follows_guard before insert on public.follows for each row execute function public.social_guard();
drop trigger if exists votes_guard on public.profile_votes;
create trigger votes_guard before insert on public.profile_votes for each row execute function public.social_guard();

-- What everyone may see: counts and a few posters per public profile. No ids, no names of who followed or voted.
create or replace view public.public_social as
select p.username,
  (select count(*) from public.follows f where f.followee = p.id) as followers,
  (select count(*) from public.follows f where f.follower = p.id) as following,
  (select count(*) from public.profile_votes v where v.target = p.id and v.vote = 1) as hearts,
  (select count(*) from public.profile_votes v where v.target = p.id and v.vote = -1) as broken
from public.profiles p where p.is_public and p.username is not null;

create or replace view public.public_posters as
select username, poster, title from (
  select p.username, e.data->>'poster' as poster, e.data->>'title' as title,
    row_number() over (partition by p.id order by coalesce((e.data->>'rating')::numeric, -1) desc, e.updated_at desc) as rn
  from public.profiles p join public.entries e on e.user_id = p.id
  where p.is_public and p.username is not null and coalesce(e.data->>'poster', '') <> ''
) t where rn <= 4;

grant select on public.public_social, public.public_posters to anon, authenticated;
