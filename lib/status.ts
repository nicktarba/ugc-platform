export const STATUS_BADGES: Record<string, { text: string; color: string; bg: string }> = {
  accepted: { text: 'В работе', color: '#16a34a', bg: '#f0fdf4' },
  declined: { text: 'Отклонено', color: '#dc2626', bg: '#fef2f2' },
  cancelled: { text: 'Отменено', color: '#7a7570', bg: '#f0ede6' },
  completed: { text: '✓ Завершено', color: '#16a34a', bg: '#f0fdf4' },
}

// Для бизнеса: показываем бейдж на любом статусе, включая new/viewed
export const businessStatusLabel = (status: string) => {
  if (status === 'new') return { text: 'Отправлено', color: '#9a9590', bg: '#f0ede6' }
  if (status === 'viewed') return { text: 'Просмотрено', color: '#c17f3e', bg: '#fdf3e7' }
  return STATUS_BADGES[status] || { text: 'Отклонено', color: '#dc2626', bg: '#fef2f2' }
}

// Для автора: new/viewed обрабатываются отдельно (бейдж "Новое" + подсветка)
export const authorStatusBadge = (status: string) => STATUS_BADGES[status] || null
