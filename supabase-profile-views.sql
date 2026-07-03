-- Таблица просмотров профилей авторов
create table if not exists profile_views (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references authors(id) on delete cascade not null,
  viewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Индекс для быстрых подсчётов по автору за период
create index if not exists idx_profile_views_author_date on profile_views (author_id, created_at desc);

alter table profile_views enable row level security;

-- Все могут вставлять (анонимные просмотры тоже считаем, viewer_id nullable)
drop policy if exists "Anyone can log view" on profile_views;
create policy "Anyone can log view"
  on profile_views for insert
  with check (true);

-- Автор видит свои просмотры
drop policy if exists "Author can view own" on profile_views;
create policy "Author can view own"
  on profile_views for select
  using (
    author_id in (
      select id from authors where user_id = auth.uid()
    )
  );
