'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DownloadIcon, FilterIcon } from 'lucide-react'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface EmployerCost {
  id: string
  payroll_id: string
  employee_id: string
  payroll_period_month: number
  payroll_period_year: number
  salary_base: number
  isss_employer: number
  afp_employer: number
  employer_total_cost: number
  created_at: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  cedula: string
}

export default function EmployerCostsPage() {
  const { toast } = useToast()
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  const [employerCosts, setEmployerCosts] = useState<EmployerCost[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      setSupabase(client)
    }
    if (supabase) {
      fetchData()
    }
  }, [supabase])

  const fetchData = async (fetchMonth?: number, fetchYear?: number) => {
    if (!supabase) return
    try {
      setIsLoading(true)
      const queryMonth = fetchMonth !== undefined ? fetchMonth : month
      const queryYear = fetchYear !== undefined ? fetchYear : year

      const [{ data: costs, error: costsError }, { data: empData }] = await Promise.all([
        supabase
          .from('employer_costs')
          .select('*')
          .eq('payroll_period_month', queryMonth)
          .eq('payroll_period_year', queryYear)
          .order('created_at', { ascending: false }),
        supabase.from('employees').select('id, first_name, last_name, cedula'),
      ])

      if (costsError) {
        throw costsError
      }

      if (costs) setEmployerCosts(costs)
      if (empData) setEmployees(empData)
    } catch (error) {
      console.error('[v0] Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Error al cargar los costos patronales',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCosts = employerCosts.filter(
    (cost) => cost.payroll_period_month === month && cost.payroll_period_year === year
  )

  const summary = filteredCosts.reduce(
    (acc, cost) => ({
      totalEmployees: acc.totalEmployees + 1,
      totalSalary: acc.totalSalary + cost.salary_base,
      totalISSSEmployer: acc.totalISSSEmployer + cost.isss_employer,
      totalAFPEmployer: acc.totalAFPEmployer + cost.afp_employer,
      totalEmployerCost: acc.totalEmployerCost + cost.employer_total_cost,
    }),
    {
      totalEmployees: 0,
      totalSalary: 0,
      totalISSSEmployer: 0,
      totalAFPEmployer: 0,
      totalEmployerCost: 0,
    }
  )

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'letter')
    const now = new Date()
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ]
    const monthName = monthNames[month - 1]
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Header
    doc.setFillColor(31, 56, 100)
    doc.rect(0, 0, pageWidth, 35, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Asociación Comunal Aguas del Tecomasuchi, C.A.', 15, 12)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`REPORTE DE COSTOS PATRONALES - ${monthName.toUpperCase()} ${year}`, 15, 23)

    doc.setFontSize(8)
    doc.setTextColor(220, 220, 220)
    const rightCol = pageWidth - 40
    doc.text(`Período: ${monthName} ${year}`, rightCol, 12)
    doc.text(`Generado: ${now.toLocaleDateString('es-SV')}`, rightCol, 17)
    doc.text(`Hora: ${now.toLocaleTimeString('es-SV')}`, rightCol, 22)

    let yPosition = 45

    // Summary Section
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DE COSTOS PATRONALES', 15, yPosition)
    yPosition += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const col1 = 15
    const col2 = 110

    doc.text(`Total de Empleados:`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`${summary.totalEmployees}`, col2, yPosition)
    yPosition += 5

    doc.setFont('helvetica', 'normal')
    doc.text(`Total Salarios Base:`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${summary.totalSalary.toFixed(2)}`, col2, yPosition)
    yPosition += 5

    doc.setFont('helvetica', 'normal')
    doc.text(`Total ISSS Patronal (7.5%):`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${summary.totalISSSEmployer.toFixed(2)}`, col2, yPosition)
    yPosition += 5

    doc.setFont('helvetica', 'normal')
    doc.text(`Total AFP Patronal (8.75%):`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${summary.totalAFPEmployer.toFixed(2)}`, col2, yPosition)
    yPosition += 7

    // Total with highlight
    doc.setFillColor(200, 215, 240)
    doc.rect(15, yPosition - 4, pageWidth - 30, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(31, 56, 100)
    doc.text('COSTO TOTAL EMPRESA:', col1, yPosition + 2)
    doc.text(`$${summary.totalEmployerCost.toFixed(2)}`, col2, yPosition + 2)
    yPosition += 12

    // Table
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('DETALLE POR EMPLEADO', 15, yPosition)
    yPosition += 6

    const headers = ['Empleado', 'DUI', 'Salario', 'ISSS (7.5%)', 'AFP (8.75%)', 'Costo Total']
    const columnWidths = [30, 20, 18, 22, 22, 28]
    const tableStartX = 12

    doc.setFillColor(31, 56, 100)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')

    let currentX = tableStartX
    headers.forEach((header, i) => {
      doc.rect(currentX, yPosition, columnWidths[i], 7, 'F')
      doc.text(header, currentX + columnWidths[i] / 2, yPosition + 4.5, {
        align: 'center',
      })
      currentX += columnWidths[i]
    })

    yPosition += 8
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)

    let rowCount = 0
    filteredCosts.forEach((cost) => {
      const employee = employees.find((e) => e.id === cost.employee_id)
      if (!employee) return

      if (yPosition > pageHeight - 18) {
        doc.addPage()
        yPosition = 20
      }

      if (rowCount % 2 === 0) {
        doc.setFillColor(245, 245, 245)
        currentX = tableStartX
        columnWidths.forEach((width) => {
          doc.rect(currentX, yPosition - 2.5, width, 5, 'F')
          currentX += width
        })
      }

      const values = [
        `${employee.first_name} ${employee.last_name}`,
        employee.cedula || 'N/A',
        `$${cost.salary_base.toFixed(2)}`,
        `$${cost.isss_employer.toFixed(2)}`,
        `$${cost.afp_employer.toFixed(2)}`,
        `$${cost.employer_total_cost.toFixed(2)}`,
      ]

      doc.setTextColor(0, 0, 0)
      currentX = tableStartX
      values.forEach((value, i) => {
        const isNumeric = i > 1
        doc.text(value, currentX + (isNumeric ? columnWidths[i] - 0.5 : 0.5), yPosition, {
          maxWidth: columnWidths[i] - 1,
          align: isNumeric ? 'right' : 'left',
        })
        currentX += columnWidths[i]
      })

      yPosition += 5
      rowCount++
    })

    doc.save(`costos-patronales-${monthName}-${year}.pdf`)

    toast({
      title: 'Éxito',
      description: 'Reporte de costos patronales exportado a PDF',
    })
  }

  const exportToExcel = () => {
    const data: any[] = []

    data.push(['REPORTE DE COSTOS PATRONALES'])
    data.push(['Asociación Comunal Aguas del Tecomasuchi, C.A.'])
    data.push([`Período: ${monthNames[month - 1]} ${year}`])
    data.push([`Generado: ${new Date().toLocaleDateString('es-SV')}`])
    data.push([])

    data.push(['RESUMEN DE COSTOS PATRONALES'])
    data.push(['Total de Empleados:', summary.totalEmployees])
    data.push(['Total Salarios Base:', summary.totalSalary])
    data.push(['Total ISSS Patronal (7.5%):', summary.totalISSSEmployer])
    data.push(['Total AFP Patronal (8.75%):', summary.totalAFPEmployer])
    data.push(['COSTO TOTAL EMPRESA:', summary.totalEmployerCost])
    data.push([])

    data.push(['DETALLE POR EMPLEADO'])
    data.push(['Empleado', 'DUI', 'Salario Base', 'ISSS Patronal', 'AFP Patronal', 'Costo Total'])

    filteredCosts.forEach((cost) => {
      const employee = employees.find((e) => e.id === cost.employee_id)
      if (!employee) return

      data.push([
        `${employee.first_name} ${employee.last_name}`,
        employee.cedula || 'N/A',
        cost.salary_base,
        cost.isss_employer,
        cost.afp_employer,
        cost.employer_total_cost,
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)
    const colWidths = [25, 18, 20, 20, 20, 20]
    ws['!cols'] = colWidths.map((width) => ({ wch: width }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Costos Patronales')
    XLSX.writeFile(wb, `costos-patronales-${monthNames[month - 1]}-${year}.xlsx`)

    toast({
      title: 'Éxito',
      description: 'Reporte de costos patronales exportado a Excel',
    })
  }

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando costos patronales...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Costos Patronales</h1>
        <p className="text-gray-600">Visualiza y gestiona los costos patronales de la empresa</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Mes</label>
            <Select value={String(month)} onValueChange={(v) => {
              const newMonth = parseInt(v)
              setMonth(newMonth)
              fetchData(newMonth, year)
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Año</label>
            <Select value={String(year)} onValueChange={(v) => {
              const newYear = parseInt(v)
              setYear(newYear)
              fetchData(month, newYear)
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={fetchData} variant="outline" className="flex-1">
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {filteredCosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader>
              <CardTitle className="text-sm text-blue-900">Total Salarios Base</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-900">
                ${summary.totalSalary.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader>
              <CardTitle className="text-sm text-orange-900">ISSS Patronal (7.5%)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-900">
                ${summary.totalISSSEmployer.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader>
              <CardTitle className="text-sm text-purple-900">AFP Patronal (8.75%)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-900">
                ${summary.totalAFPEmployer.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Costos por Empleado - {monthNames[month - 1]} {year}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <DownloadIcon className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <DownloadIcon className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCosts.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No hay costos patronales registrados para este período
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Empleado</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">DUI</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      Salario Base
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      ISSS (7.5%)
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      AFP (8.75%)
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Costo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCosts.map((cost, index) => {
                    const employee = employees.find((e) => e.id === cost.employee_id)
                    return (
                      <tr key={cost.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="px-4 py-3">
                          {employee?.first_name} {employee?.last_name}
                        </td>
                        <td className="px-4 py-3">{employee?.cedula}</td>
                        <td className="px-4 py-3 text-right">${cost.salary_base.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-600">
                          ${cost.isss_employer.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-purple-600">
                          ${cost.afp_employer.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          ${cost.employer_total_cost.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={2} className="px-4 py-3">
                      TOTALES
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${summary.totalSalary.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      ${summary.totalISSSEmployer.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-600">
                      ${summary.totalAFPEmployer.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      ${summary.totalEmployerCost.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
