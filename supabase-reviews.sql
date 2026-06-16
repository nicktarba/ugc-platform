-- Telegram подписчики
alter table authors add column if not exists telegram_followers int default 0;

-- Средний рейтинг (обновляется триггером)
alter table authors add column if not exists avg_rating numeric(3,2) default null;
alter table authors add column if not exists reviews_count int default 0;

-- Таблица отзывов
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete cascade,
  author_id uuid references authors(id) on delete cascade,
  business_id uuid references auth.users(id) on delete cascade,
  rating int check (rating between 1 and 5) not null,
  comment text,
  created_at timestamptz default now(),
  unique(request_id)
);

alter table reviews enable row level security;

-- Бизнес может создать отзыв по своей сделке (только одну на заявку)
drop policy if exists "Business can insert review" on reviews;
create policy "Business can insert review"
  on reviews for insert
  with check (
    auth.uid() = business_id
    and exists (
      select 1 from requests
      where requests.id = request_id
        and requests.business_id = auth.uid()
        and requests.status = 'completed'
    )
  );

-- Все могут читать отзывы (публичные)
drop policy if exists "Reviews are public" on reviews;
create policy "Reviews are public"
  on reviews for select using (true);

-- Триггер: пересчитывает avg_rating и reviews_count при добавлении отзыва
create or replace function recalculate_author_rating()
returns trigger language plpgsql as $$
begin
  update authors set
    avg_rating = (select round(avg(rating)::numeric, 2) from reviews where author_id = NEW.author_id),
    reviews_count = (select count(*) from reviews where author_id = NEW.author_id)
  where id = NEW.author_id;
  return NEW;
end;
$$;

drop trigger if exists trg_author_rating on reviews;
create trigger trg_author_rating
  after insert or update or delete on reviews
  for each row execute function recalculate_author_rating();

-- Пересчитать completed_deals_count из существующих данных
update authors set completed_deals_count = (
  select count(*) from requests
  where requests.author_id = authors.id
    and requests.status = 'completed'
);
