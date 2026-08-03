import Link from 'next/link'

type Props = {
  className?: string
}

export default function PublicBrand({ className = '' }: Props) {
  return (
    <Link href="/" className={className} aria-label="СВОИ UGC — на главную">
      <span>СВОИ</span>
      <strong>UGC</strong>
    </Link>
  )
}
