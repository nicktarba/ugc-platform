import type { SVGProps } from 'react'

type IconName =
  | 'search' | 'sparkles' | 'filters' | 'heart' | 'pin' | 'users' | 'eye'
  | 'star' | 'message' | 'arrowLeft' | 'arrowRight' | 'instagram' | 'telegram'
  | 'share' | 'flag' | 'close' | 'grid' | 'building' | 'home' | 'bell'
  | 'user' | 'briefcase' | 'shield' | 'help' | 'logout' | 'chevronDown'
  | 'sliders' | 'check' | 'calendar' | 'wallet' | 'external' | 'menu'

export default function UiIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }

  const path = (() => {
    switch (name) {
      case 'search': return <><circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2"/></>
      case 'sparkles': return <><path d="m12 3 1.2 3.2L16.5 7.5l-3.3 1.3L12 12l-1.2-3.2-3.3-1.3 3.3-1.3L12 3Z"/><path d="m18.5 13 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/><path d="m5.5 14 .9 2.2 2.1.8-2.1.9-.9 2.1-.8-2.1-2.2-.9 2.2-.8.8-2.2Z"/></>
      case 'filters':
      case 'sliders': return <><path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/></>
      case 'heart': return <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>
      case 'pin': return <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>
      case 'users': return <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>
      case 'eye': return <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></>
      case 'star': return <path d="m12 2.7 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.7Z"/>
      case 'message': return <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></>
      case 'arrowLeft': return <><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></>
      case 'arrowRight': return <><path d="m9 18 6-6-6-6"/><path d="M5 12h10"/></>
      case 'instagram': return <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></>
      case 'telegram': return <path d="m21 4-3 16-6-4-3 3-1-5-5-2 18-8Z"/>
      case 'share': return <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>
      case 'flag': return <><path d="M5 21V4"/><path d="M5 5h11l-1 4 1 4H5"/></>
      case 'close': return <><path d="m6 6 12 12M18 6 6 18"/></>
      case 'grid': return <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>
      case 'building': return <><path d="M3 21h18"/><path d="M6 21V5l6-3 6 3v16"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></>
      case 'home': return <><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-7h6v7"/></>
      case 'bell': return <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>
      case 'user': return <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>
      case 'briefcase': return <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></>
      case 'shield': return <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>
      case 'help': return <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-1 .7-1.5 1.1-1.5 2.2"/><path d="M12 17h.01"/></>
      case 'logout': return <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>
      case 'chevronDown': return <path d="m6 9 6 6 6-6"/>
      case 'check': return <path d="m5 12 4 4L19 6"/>
      case 'calendar': return <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>
      case 'wallet': return <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"/><path d="M16 13h2"/></>
      case 'external': return <><path d="M14 3h7v7"/><path d="m10 14 11-11"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></>
      case 'menu': return <><path d="M4 7h16M4 12h16M4 17h16"/></>
    }
  })()

  return <svg {...common}>{path}</svg>
}
