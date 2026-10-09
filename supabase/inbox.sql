-- Reply notifications, richer title suggestions, and limits on poster uploads. Run after feedback.sql and custom-posters.sql. Safe to run more than once.

-- 1. Remember when each person last looked at the answers to their messages (drives the dot on the account menu).
alter table public.feedback add column if not exists reply_seen_at timestamptz;
create or replace function public.mark_replies_seen() returns void
language sql security definer set search_path = public as $$
  update public.feedback set reply_seen_at = now()
  where user_id = auth.uid() and (reply_seen_at is null or reply_seen_at < updated_at);
$$;
revoke all on function public.mark_replies_seen() from public, anon;
grant execute on function public.mark_replies_seen() to authenticated;

-- 2. A "suggest for everyone" message carries director, cast, genres, summary and poster, so allow more room.
alter table public.feedback drop constraint if exists feedback_title_data_check;
alter table public.feedback drop constraint if exists feedback_title_data_size;
alter table public.feedback add constraint feedback_title_data_size check (title_data is null or pg_column_size(title_data) < 6000);

-- 3. Poster uploads: images only, 300 KB at most, whatever a browser or script tries to send.
update storage.buckets set file_size_limit = 307200, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'posters';
