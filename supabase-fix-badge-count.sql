-- Фикс: не считаем непрочитанные сообщения для заявок со статусом 'new',
-- иначе одна новая заявка с сообщением даёт бейдж 2 вместо 1

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
         and r.status != 'new'
         and m.sender_role = 'business'
         and m.read = false)::int
$$;
