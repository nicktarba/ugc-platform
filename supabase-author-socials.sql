-- Добавляем Telegram и счётчик завершённых сделок
alter table authors add column if not exists telegram_url text;

-- Счётчик завершённых сделок — обновляется триггером при смене статуса на completed
alter table authors add column if not exists completed_deals_count int default 0;

-- Триггер: при завершении сделки инкрементируем счётчик у автора
create or replace function increment_author_completed_deals()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'completed' and OLD.status != 'completed' then
    update authors set completed_deals_count = completed_deals_count + 1
    where id = NEW.author_id;
  end if;
  -- если сделку "разжаловали" из completed (edge case) — декрементируем
  if OLD.status = 'completed' and NEW.status != 'completed' then
    update authors set completed_deals_count = greatest(0, completed_deals_count - 1)
    where id = NEW.author_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_author_completed_deals on requests;
create trigger trg_author_completed_deals
  after update on requests
  for each row execute function increment_author_completed_deals();
