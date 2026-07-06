-- Логирование поисковых запросов для анализа и расширения CONCEPT_MAP / будущих эмбеддингов
create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  mode text not null check (mode in ('regular', 'ai')),
  results_count int default 0,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_search_logs_created on search_logs (created_at desc);
create index if not exists idx_search_logs_query on search_logs (query);

alter table search_logs enable row level security;

-- Любой может писать логи (включая анонимов)
drop policy if exists "Anyone can insert search log" on search_logs;
create policy "Anyone can insert search log"
  on search_logs for insert
  with check (true);

-- Только админ читает
drop policy if exists "Admin can view search logs" on search_logs;
create policy "Admin can view search logs"
  on search_logs for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
