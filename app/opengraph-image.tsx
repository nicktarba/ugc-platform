import { ImageResponse } from 'next/og'

export const alt = 'СВОИ UGC — платформа UGC-авторов'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px', background: '#171614', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 38, fontWeight: 800, letterSpacing: '-1px' }}>СВОИ <span style={{ color: '#d7a564', marginLeft: 10 }}>UGC</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 920 }}>
        <div style={{ fontSize: 72, lineHeight: 1.02, fontWeight: 800, letterSpacing: '-3px' }}>UGC-авторы для вашего бизнеса</div>
        <div style={{ fontSize: 28, lineHeight: 1.4, marginTop: 24, color: '#d9d3cb' }}>Поиск по городу и тематике · предложения · чат · сделки</div>
      </div>
      <div style={{ fontSize: 24, color: '#aaa39a' }}>svoi-ugc.ru</div>
    </div>,
    size,
  )
}
