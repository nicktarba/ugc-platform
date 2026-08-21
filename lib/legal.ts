export const LEGAL_EFFECTIVE_DATE = '21 августа 2026 года'
export const PERSONAL_DATA_CONSENT_VERSION = '2026-08-21'
export const TERMS_VERSION = '2026-08-21'
export const AUTHOR_PUBLICATION_CONSENT_VERSION = '2026-08-21'

export const LEGAL_OPERATOR = {
  name: 'ИП Тарба Никита Эдуардович',
  shortName: 'ИП Тарба Н. Э.',
  inn: '253909154755',
  ogrnip: '325253600113099',
  email: 'support@svoi-ugc.ru',
  site: 'https://svoi-ugc.ru',
} as const

export const AUTHOR_PUBLICATION_FIELD_KEYS = [
  'profile_identifier',
  'name',
  'city',
  'instagram_url',
  'telegram_url',
  'followers_count',
  'telegram_followers',
  'stories_views',
  'occupation',
  'lifestyle',
  'hobbies',
  'bio',
  'open_to_barter',
  'avatar_url',
  'platform_reputation',
] as const

export const AUTHOR_PUBLICATION_REQUIRED_FIELD_KEYS = [
  'profile_identifier',
  'name',
  'city',
  'instagram_url',
  'open_to_barter',
  'platform_reputation',
] as const
