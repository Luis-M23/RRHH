'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    BarChart3,
    Users,
    Building2,
    Briefcase,
    FileText,
    LogOut,
    Menu,
    X,
    Home,
    Sliders,
    Calendar,
  } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const menuItems = [
    {
      label: 'Panel Principal',
      href: '/dashboard',
      icon: Home,
    },
    {
      label: 'Unidades Administrativas',
      href: '/dashboard/administrative-units',
      icon: Building2,
    },
    {
      label: 'Puestos',
      href: '/dashboard/positions',
      icon: Briefcase,
    },
    {
      label: 'Cargos',
      href: '/dashboard/roles',
      icon: BarChart3,
    },
    {
      label: 'Empleados',
      href: '/dashboard/employees',
      icon: Users,
    },
    {
      label: 'Planillas',
      href: '/dashboard/payroll',
      icon: FileText,
    },
    {
      label: 'Parámetros de Descuentos',
      href: '/dashboard/parameters',
      icon: Sliders,
    },
    {
      label: 'Ausencias',
      href: '/dashboard/absences',
      icon: Calendar,
    },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img
            src="/logo-aguas.png"
            alt="Logo"
            className="w-8 h-8"
          />
          <span className="font-semibold text-sm">RH Planillas</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-white/20 rounded-lg transition"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div
          className={`fixed md:sticky md:inset-auto inset-y-12 md:inset-y-0 left-0 top-12 md:top-0 z-40 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
        {/* Logo Section */}
        <div className="hidden md:flex items-center gap-3 p-6 border-b border-gray-200">
          <img
            src="/logo-aguas.png"
            alt="Logo"
            className="w-10 h-10"
          />
          <div>
            <h2 className="font-bold text-sm text-gray-800">AGUAS DEL</h2>
            <p className="text-xs text-gray-600">Tecomasuchi</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full">
          {/* Top Header */}
          <header className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">
                Sistema de Gestión de Planillas
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Menú</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut size={16} className="mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Mobile User Menu */}
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-end">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-red-600"
            >
              <LogOut size={16} className="mr-2" />
              Salir
            </Button>
          </div>

          {/* Page Content */}
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
