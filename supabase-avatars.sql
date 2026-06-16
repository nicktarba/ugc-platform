-- 1. Добавляем поле avatar_url в таблицу authors
alter table authors add column if not exists avatar_url text;

-- 2. Создаём публичный bucket для аватаров
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Политики Storage: читать могут все (bucket публичный), писать — только владелец
drop policy if exists "Avatar upload own" on storage.objects;
create policy "Avatar upload own"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Avatar update own" on storage.objects;
create policy "Avatar update own"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Avatar delete own" on storage.objects;
create policy "Avatar delete own"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');
