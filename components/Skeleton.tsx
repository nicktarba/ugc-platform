'use client'

const shimmer = `
@keyframes ugcSkeletonShimmer {
  0% { background-position: -420px 0; }
  100% { background-position: 420px 0; }
}
`

const bar = (width: string, height = '12px'): React.CSSProperties => ({
  width,
  height,
  borderRadius:'7px',
  background:'linear-gradient(90deg, #f1efec 25%, #e7e4e0 50%, #f1efec 75%)',
  backgroundSize:'840px 100%',
  animation:'ugcSkeletonShimmer 1.5s infinite linear',
})

export function CatalogSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(290px, 100%), 1fr))', gap:'16px' }}>
        {[0,1,2,3,4,5].map(item => (
          <div key={item} style={{ overflow:'hidden', border:'1px solid #e8e5e1', borderRadius:'20px', background:'#fff' }}>
            <div style={{ height:'254px', ...bar('100%','254px'), borderRadius:0 }} />
            <div style={{ padding:'17px' }}>
              <div style={bar('52%','16px')} />
              <div style={{ marginTop:'8px', ...bar('67%','10px') }} />
              <div style={{ marginTop:'18px', display:'flex', gap:'6px' }}><div style={bar('64px','24px')} /><div style={bar('76px','24px')} /></div>
              <div style={{ marginTop:'17px', ...bar('100%','52px') }} />
              <div style={{ marginTop:'14px', display:'flex', gap:'8px' }}><div style={bar('50%','38px')} /><div style={bar('50%','38px')} /></div>
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
        <div style={{ alignSelf:'flex-start', ...bar('60%','48px') }} />
        <div style={{ alignSelf:'flex-end', ...bar('50%','40px') }} />
        <div style={{ alignSelf:'flex-start', ...bar('70%','56px') }} />
        <div style={{ alignSelf:'flex-end', ...bar('45%','36px') }} />
      </div>
    </>
  )
}

export function ProfileSkeleton() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={{ width:'min(1180px, calc(100% - 40px))', margin:'0 auto', padding:'36px 0' }}>
        <div style={{ overflow:'hidden', display:'grid', gridTemplateColumns:'minmax(260px, 360px) 1fr', border:'1px solid #e8e5e1', borderRadius:'24px', background:'#fff' }}>
          <div style={{ ...bar('100%','430px'), borderRadius:0 }} />
          <div style={{ padding:'42px' }}>
            <div style={bar('90px','10px')} />
            <div style={{ marginTop:'14px', ...bar('56%','38px') }} />
            <div style={{ marginTop:'12px', ...bar('38%','12px') }} />
            <div style={{ marginTop:'28px', ...bar('92%','12px') }} />
            <div style={{ marginTop:'8px', ...bar('76%','12px') }} />
            <div style={{ marginTop:'30px', ...bar('100%','76px') }} />
          </div>
        </div>
      </div>
    </>
  )
}
