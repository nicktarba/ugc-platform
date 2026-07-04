'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Промежуточная страница заявки убрана — редирект в чат
export default function RequestRedirect() {
  const params = useParams()
  const router = useRouter()
  useEffect(() => {
    router.replace(`/dashboard/chat/${params.id}`)
  }, [params.id, router])
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Переадресация...</div>
}
