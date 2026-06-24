'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BecomeAuthorPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/author/profile') }, [router])
  return null
}

