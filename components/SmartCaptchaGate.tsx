'use client'

import { useEffect, useId, useRef } from 'react'

const SITE_KEY = 'ysc1_vXh7pG6skhFMyVxUxFBD72QO0bB4YqKXB8X2Oweffeef44da'
const SCRIPT_ID = 'yandex-smartcaptcha-script'

type SmartCaptchaApi = {
  render: (container: HTMLElement | string, params: Record<string, unknown>) => number
  execute: (widgetId?: number) => void
  destroy?: (widgetId?: number) => void
}

declare global {
  interface Window {
    smartCaptcha?: SmartCaptchaApi
  }
}

type Props = {
  trigger: number
  onSuccess: (token: string) => void
  onError: (message: string) => void
}

export default function SmartCaptchaGate({ trigger, onSuccess, onError }: Props) {
  const reactId = useId().replace(/:/g, '')
  const containerId = `smartcaptcha-${reactId}`
  const widgetIdRef = useRef<number | null>(null)
  const lastTriggerRef = useRef(0)

  useEffect(() => {
    const ensureScript = () => new Promise<void>((resolve, reject) => {
      if (window.smartCaptcha) return resolve()
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('captcha script failed')), { once: true })
        return
      }
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://smartcaptcha.cloud.yandex.ru/captcha.js'
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('captcha script failed'))
      document.head.appendChild(script)
    })

    void ensureScript().catch(() => onError('Не удалось загрузить защиту от ботов. Обновите страницу и попробуйте снова.'))
  }, [onError])

  useEffect(() => {
    if (!trigger || trigger === lastTriggerRef.current) return
    lastTriggerRef.current = trigger

    const run = async () => {
      try {
        if (!window.smartCaptcha) {
          const started = Date.now()
          while (!window.smartCaptcha && Date.now() - started < 5000) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
        if (!window.smartCaptcha) throw new Error('captcha unavailable')

        if (widgetIdRef.current !== null && window.smartCaptcha.destroy) {
          try { window.smartCaptcha.destroy(widgetIdRef.current) } catch {}
          widgetIdRef.current = null
        }

        const widgetId = window.smartCaptcha.render(containerId, {
          sitekey: SITE_KEY,
          hl: 'ru',
          invisible: true,
          shieldPosition: 'bottom-right',
          callback: (token: string) => {
            if (typeof token === 'string' && token.length > 0) onSuccess(token)
            else onError('Не удалось пройти проверку. Попробуйте ещё раз.')
          },
        })
        widgetIdRef.current = widgetId
        window.smartCaptcha.execute(widgetId)
      } catch {
        onError('Не удалось запустить защиту от ботов. Обновите страницу и попробуйте снова.')
      }
    }

    void run()
  }, [containerId, onError, onSuccess, trigger])

  useEffect(() => () => {
    if (widgetIdRef.current !== null && window.smartCaptcha?.destroy) {
      try { window.smartCaptcha.destroy(widgetIdRef.current) } catch {}
    }
  }, [])

  return <div id={containerId} aria-hidden="true" />
}
