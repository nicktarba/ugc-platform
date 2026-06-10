create table authors (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  name text not null,
  city text not null,
  instagram_url text not null,
  followers_count integer default 0,
  stories_views integer default 0,
  occupation text,
  lifestyle text[] default '{}',
  hobbies text,
  bio text,
  open_to_barter boolean default false,
  status text default 'approved'
);

-- Открываем публичный доступ для чтения и записи (для MVP)
alter table authors enable row level security;

create policy "Anyone can read authors"
  on authors for select using (true);

create policy "Anyone can insert authors"
  on authors for insert with check (true);
