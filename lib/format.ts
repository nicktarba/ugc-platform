export const truncate = (s: string, n = 110) => s.length > n ? s.slice(0, n).trim() + '…' : s

export const isValidUrl = (url: string) => {
  if (!url || !url.trim()) return true
  return /^https?:\/\/.+/.test(url.trim())
}

export const formatRelative = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  const diffDays = Math.floor((today.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000)
  if (diffDays === 0) return 'сегодня'
  if (diffDays === 1) return 'вчера'
  if (diffDays < 7) return `${diffDays} дн назад`
  return d.toLocaleDateString('ru', { day:'numeric', month:'short' })
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru', { day:'numeric', month:'short' })
