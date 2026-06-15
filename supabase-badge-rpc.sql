-- Бейдж бизнеса: непрочитанные сообщения от авторов (1 запрос вместо 2)
create or replace function get_business_badge_count(p_business_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from messages m
  join requests r on r.id = m.request_id
  where r.business_id = p_business_id
    and m.sender_role = 'author'
    and m.read = false
$$;

-- Бейдж автора: новые заявки (status='new') + непрочитанные сообщения от бизнеса (1 запрос вместо 2)
create or replace function get_author_badge_count(p_author_id uuid)
returns int
language sql
stable
as $$
  select
    (select count(*) from requests where author_id = p_author_id and status = 'new')::int
    +
    (select count(*)
       from messages m
       join requests r on r.id = m.request_id
       where r.author_id = p_author_id
         and m.sender_role = 'business'
         and m.read = false)::int
$$;
