-- Включаем Realtime для таблиц messages и requests (идемпотентно — безопасно перезапускать)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'requests'
  ) then
    alter publication supabase_realtime add table requests;
  end if;
end $$;

-- Проверка: какие таблицы сейчас в публикации realtime
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
