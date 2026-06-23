-- Позволяем читать business_profiles через отзывы (для публичного профиля автора)
drop policy if exists "Business profiles readable via reviews" on business_profiles;
create policy "Business profiles readable via reviews"
  on business_profiles for select using (
    exists (
      select 1 from reviews
      where reviews.business_id = business_profiles.id
    )
  );
