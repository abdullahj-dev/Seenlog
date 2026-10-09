-- Storage for posters of titles you add by hand. Safe to run more than once.
-- Supabase dashboard > SQL Editor > paste > Run.
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do update set public = true;

drop policy if exists "posters read" on storage.objects;
create policy "posters read" on storage.objects for select using (bucket_id = 'posters');

drop policy if exists "posters insert own" on storage.objects;
create policy "posters insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "posters update own" on storage.objects;
create policy "posters update own" on storage.objects for update to authenticated
  using (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "posters delete own" on storage.objects;
create policy "posters delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);
