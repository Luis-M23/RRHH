'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [supabaseConfigured, setSupabaseConfigured] = useState(true)

  useEffect(() => {
    // Check if Supabase is configured
    try {
      createClient()
    } catch (e) {
      setSupabaseConfigured(false)
      console.warn(
        '[v0] Supabase not configured. Please set environment variables.'
      )
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-8">
          {/* Logo and Company Header */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-24 h-24">
              <img
                src="/logo-aguas.png"
                alt="Asociación Comunal Aguas del Tecomasuchi"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800">
                Asociación Comunal Aguas del Tecomasuchi
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Sistema de Gestión de Planillas
              </p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl">Ingreso al Sistema</CardTitle>
              <CardDescription className="text-blue-50">
                Ingresa tus credenciales para acceder al sistema de RH
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!supabaseConfigured && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                  <p className="font-semibold mb-1">⚠️ Configuración Pendiente</p>
                  <p>
                    Por favor, configura las variables de entorno de Supabase
                    (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)
                    en el panel de configuración del proyecto.
                  </p>
                </div>
              )}
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="font-medium">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@aguas.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="font-medium">
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Ingresando...' : 'Ingresar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600">
            <p>© 2026 Asociación Comunal Aguas del Tecomasuchi, C.A.</p>
            <p className="text-xs mt-1">Todos los derechos reservados</p>
          </div>
        </div>
      </div>
    </div>
  )
}
