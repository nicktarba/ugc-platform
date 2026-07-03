-- Таблица жалоб
create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null not null,
  target_author_id uuid references authors(id) on delete cascade,
  target_business_id uuid references profiles(id) on delete cascade,
  reason text not null,
  comment text,
  status text default 'new' check (status in ('new', 'reviewed', 'dismissed')),
  created_at timestamptz default now()
);

create index if not exists idx_complaints_status on complaints (status, created_at desc);

alter table complaints enable row level security;

-- Любой авторизованный может подать жалобу
drop policy if exists "Auth users can insert" on complaints;
create policy "Auth users can insert"
  on complaints for insert
  with check (auth.uid() = reporter_id);

-- Только админ видит жалобы (через service_role или отдельную проверку)
drop policy if exists "Admin can view" on complaints;
create policy "Admin can view"
  on complaints for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
