-- Профиль бизнеса: название компании, ниша, сайт/соцсети, описание.
-- Отдельная таблица (не profiles!) — чтобы бизнес мог редактировать свою визитку
-- без риска поменять себе role/email через прямой API.

create table if not exists business_profiles (
  id uuid primary key references auth.users on delete cascade,
  company_name text,
  website_url text,
  niche text,
  description text,
  updated_at timestamptz default now()
);

alter table business_profiles enable row level security;

-- Бизнес читает и редактирует свою визитку
drop policy if exists "Business can read own profile" on business_profiles;
create policy "Business can read own profile"
  on business_profiles for select using (auth.uid() = id);

drop policy if exists "Business can insert own profile" on business_profiles;
create policy "Business can insert own profile"
  on business_profiles for insert with check (auth.uid() = id);

drop policy if exists "Business can update own profile" on business_profiles;
create policy "Business can update own profile"
  on business_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Авторы видят визитку бизнеса, если бизнес отправлял им заявку (показ в чате/заявке)
drop policy if exists "Authors can read business profile of their requests" on business_profiles;
create policy "Authors can read business profile of their requests"
  on business_profiles for select using (
    exists (
      select 1 from requests
      join authors on authors.id = requests.author_id
      where requests.business_id = business_profiles.id
        and authors.user_id = auth.uid()
    )
  );
