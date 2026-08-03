export default function LoadingScreen() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading-brand">СВОИ <span>UGC</span></div>
      <div className="app-loading-line"><span /></div>
      <span className="app-loading-label">Загрузка</span>
    </div>
  )
}
