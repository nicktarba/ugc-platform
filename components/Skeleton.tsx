'use client'

const shimmer = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`

const bar = (w: string, h = '14px', mb = '8px'): React.CSSProperties => ({
  width: w, height: h, borderRadius: '8px', marginBottom: mb,
  background: 'linear-gradient(90deg, #f0ede6 25%, #e8e4dc 50%, #f0ede6 75%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.5s infinite linear',
})

export function CatalogSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap:'16px' }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', overflow:'hidden' }}>
            <div style={{ height:'80px', background:'linear-gradient(135deg, #f0ede6 0%, #e8e4dc 100%)' }} />
            <div style={{ padding:'36px 20px 20px' }}>
              <div style={bar('60%', '18px', '10px')} />
              <div style={bar('40%', '12px', '16px')} />
              <div style={bar('90%', '12px', '6px')} />
              <div style={bar('70%', '12px', '16px')} />
              <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
                <div style={bar('60px', '24px', '0')} />
                <div style={bar('60px', '24px', '0')} />
                <div style={bar('60px', '24px', '0')} />
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <div style={bar('50%', '36px', '0')} />
                <div style={bar('50%', '36px', '0')} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function ChatSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px', padding:'20px' }}>
        <div style={{ alignSelf:'flex-start', ...bar('60%', '48px', '0') }} />
        <div style={{ alignSelf:'flex-end', ...bar('50%', '40px', '0') }} />
        <div style={{ alignSelf:'flex-start', ...bar('70%', '56px', '0') }} />
        <div style={{ alignSelf:'flex-end', ...bar('45%', '36px', '0') }} />
      </div>
    </>
  )
}

export function ProfileSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'48px 20px' }}>
        <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', overflow:'hidden' }}>
          <div style={{ height:'100px', background:'linear-gradient(135deg, #f0ede6 0%, #e8e4dc 100%)' }} />
          <div style={{ padding:'44px 24px 24px', textAlign:'center' }}>
            <div style={{ ...bar('40%', '20px', '10px'), margin:'0 auto 10px' }} />
            <div style={{ ...bar('30%', '14px', '20px'), margin:'0 auto 20px' }} />
            <div style={{ ...bar('80%', '14px', '6px'), margin:'0 auto' }} />
            <div style={{ ...bar('60%', '14px', '0'), margin:'6px auto 0' }} />
          </div>
        </div>
      </div>
    </>
  )
}

