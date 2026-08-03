type AuthErrorLike = {
  message?: string
  status?: number
  code?: string
}

export function getAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
  action: 'login' | 'register' | 'reset' | 'update' = 'login',
): string {
  if (!error) return 'Не удалось выполнить действие. Попробуйте ещё раз.'

  const message = (error.message || '').toLowerCase()
  const code = (error.code || '').toLowerCase()

  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('fetch failed') ||
    code.includes('network')
  ) {
    return 'Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.'
  }

  if (
    message.includes('invalid api key') ||
    message.includes('no api key') ||
    code.includes('invalid_api_key')
  ) {
    return 'Сервис авторизации подключён некорректно. Проверьте настройки проекта или попробуйте позже.'
  }

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'Неверный email или пароль.'
  }

  if (message.includes('email not confirmed')) {
    return 'Email ещё не подтверждён. Проверьте почту и перейдите по ссылке из письма.'
  }

  if (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    code.includes('user_already_exists')
  ) {
    return 'Аккаунт с таким email уже существует. Попробуйте войти.'
  }

  if (message.includes('password should be at least') || message.includes('weak password')) {
    return 'Пароль должен содержать минимум 6 символов.'
  }

  if (message.includes('invalid email')) {
    return 'Проверьте, правильно ли указан email.'
  }

  if (message.includes('rate limit') || error.status === 429) {
    return 'Слишком много попыток. Подождите немного и попробуйте снова.'
  }

  if (error.status === 401 || error.status === 403 || message.includes('jwt')) {
    return 'Сервис авторизации временно недоступен. Попробуйте позже.'
  }

  if (action === 'register') return 'Не удалось создать аккаунт. Попробуйте ещё раз.'
  if (action === 'reset') return 'Не удалось отправить письмо. Попробуйте ещё раз.'
  if (action === 'update') return 'Не удалось обновить пароль. Запросите новую ссылку или попробуйте позже.'
  return 'Не удалось войти. Попробуйте ещё раз.'
}
