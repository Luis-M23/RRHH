'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Briefcase, FileText, TrendingUp } from 'lucide-react'

interface DashboardStats {
  totalEmployees: number
  totalAdministrativeUnits: number
  totalPositions: number
  totalRoles: number
  recentPayrolls: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalAdministrativeUnits: 0,
    totalPositions: 0,
    totalRoles: 0,
    recentPayrolls: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: employeeCount },
          { count: unitCount },
          { count: positionCount },
          { count: roleCount },
          { count: payrollCount },
        ] = await Promise.all([
          supabase.from('employees').select('*', { count: 'exact', head: true }),
          supabase.from('administrative_units').select('*', { count: 'exact', head: true }),
          supabase.from('positions').select('*', { count: 'exact', head: true }),
          supabase.from('roles').select('*', { count: 'exact', head: true }),
          supabase
            .from('payroll_records')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved'),
        ])

        setStats({
          totalEmployees: employeeCount || 0,
          totalAdministrativeUnits: unitCount || 0,
          totalPositions: positionCount || 0,
          totalRoles: roleCount || 0,
          recentPayrolls: payrollCount || 0,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  const statCards = [
    {
      title: 'Empleados',
      value: stats.totalEmployees,
      description: 'Total de empleados activos',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Unidades Administrativas',
      value: stats.totalAdministrativeUnits,
      description: 'Áreas o departamentos',
      icon: Building2,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'Puestos',
      value: stats.totalPositions,
      description: 'Posiciones registradas',
      icon: Briefcase,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Cargos',
      value: stats.totalRoles,
      description: 'Roles o cargos',
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'Planillas Aprobadas',
      value: stats.recentPayrolls,
      description: 'Planillas procesadas',
      icon: FileText,
      color: 'from-pink-500 to-pink-600',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white p-6 md:p-8 rounded-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Bienvenido al Sistema de RH
        </h1>
        <p className="text-blue-50 text-lg">
          Asociación Comunal Aguas del Tecomasuchi, C.A.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border-0 shadow-md hover:shadow-lg transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      {stat.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {stat.description}
                    </CardDescription>
                  </div>
                  <div
                    className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} text-white`}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {loading ? '...' : stat.value}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                Gestionar Empleados
              </CardTitle>
              <CardDescription>
                Ver, crear y editar empleados
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={20} className="text-green-600" />
                Generar Planilla
              </CardTitle>
              <CardDescription>
                Crear y calcular nuevas planillas
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 size={20} className="text-purple-600" />
                Configurar Áreas
              </CardTitle>
              <CardDescription>
                Gestionar unidades administrativas
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Información del Sistema</h2>
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                Sistema de gestión integral de recursos humanos
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                Cálculo automático de planillas con estándares salvadoreños
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full" />
                Exportación de reportes en PDF y Excel
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
                Gestión de empleados, puestos, cargos y áreas
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
