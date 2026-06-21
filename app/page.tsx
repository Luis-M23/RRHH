'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect immediately without checking auth
    // The middleware will handle the session/auth check
    router.push('/auth/login')
  }, [router])

  // Show loading screen while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
      <div className="text-center">
        <div className="mb-4">
          <img
            src="/logo-aguas.png"
            alt="Logo"
            className="w-16 h-16 mx-auto mb-4"
          />
        </div>
        <p className="text-gray-600 font-semibold">
          Cargando Sistema de RH...
        </p>
      </div>
    </div>
  )
}
