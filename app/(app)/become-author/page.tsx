'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'

export default function BecomeAuthorPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/author/profile') }, [router])
  return <LoadingScreen />
}
