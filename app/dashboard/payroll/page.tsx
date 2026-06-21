'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Download, Plus, Eye, Trash2, CheckCircle2 } from 'lucide-react'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import {
  getEmployeeAbsencesInPeriod,
  calculateAbsenceDeduction,
  calculateDaysBetween,
} from '@/lib/absences'
import { PayrollDetailModal } from '@/components/payroll-detail-modal'

interface Absence {
  id: string
  employee_id: string
  absence_type: string
  start_date: string
  end_date: string
  days_quantity: number
  is_paid: boolean
  reason?: string
  observations?: string
  status: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  cedula: string
  salary: number
  hire_date: string
}

interface PayrollRecord {
  id: string
  employee_id: string
  payroll_period_month: number
  payroll_period_year: number
  gross_salary: number
  isapres: number
  afp: number
  renta: number
  other_deductions: number
  net_salary: number
  status: string
  created_at: string
}

interface PayrollParameter {
  parameter_name: string
  value: number
}

interface PayrollParameters {
  [key: string]: PayrollParameter
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [payrollParameters, setPayrollParameters] = useState<PayrollParameters>({})
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [enableQuincena25, setEnableQuincena25] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [{ data: employeesData }, { data: payrollData }, { data: parametersData }] = await Promise.all(
        [
          supabase.from('employees').select('*').eq('status', 'active'),
          supabase
            .from('payroll_records')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase.from('payroll_parameters').select('*'),
        ]
      )

      setEmployees(employeesData || [])
      setPayrollRecords(payrollData || [])

      // Load parameters from database - only use what's configured
      const params: PayrollParameters = {}
      if (parametersData && parametersData.length > 0) {
        parametersData.forEach((param: any) => {
          params[param.parameter_name] = {
            parameter_name: param.parameter_name,
            value: param.value,
          }
        })
      }
      
      setPayrollParameters(params)

      // Load absences from localStorage or Supabase
      let absencesData: Absence[] = []
      const { data: absDataResult } = await supabase
        .from('absences')
        .select('*')
        .order('start_date', { ascending: false })
      
      if (absDataResult) {
        absencesData = absDataResult
        localStorage.setItem('absences', JSON.stringify(absDataResult))
      } else {
        const storedAbsences = localStorage.getItem('absences')
        absencesData = storedAbsences ? JSON.parse(storedAbsences) : []
      }

      setAbsences(absencesData)
    } catch (error) {
      console.error('[v0] Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcula Quincena 25 (beneficio del 50% del salario si <= $1,500)
  const calcularQuincena25 = (salarioBase: number): number => {
    // Solo aplica si salario <= $1,500
    if (salarioBase <= 1500) {
      return Math.round(salarioBase * 0.5 * 100) / 100
    }
    return 0
  }

  // Valida si se puede generar Quincena 25 (solo entre 15 y 25 de enero)
  const canGenerateQuincena25 = (month: number, day: number): boolean => {
    return month === 1 && day >= 15 && day <= 25
  }

  // Calcula el ISSS laboral con techo máximo de $30.00
  // Fórmula: ISSS = mín(salarioBase × 0.03, 30.00)
  const calcularISSS = (salarioBase: number): number => {
    const descuentoBase = salarioBase * 0.03
    return Math.min(descuentoBase, 30.0)
  }

  // Calcula el ISR según los tramos del Decreto Ejecutivo No. 10 de 2025 de El Salvador
  const calcularRenta = (
    salarioBruto: number,
    descuentoISSS: number,
    descuentoAFP: number,
    otrosDescuentosNoGravados: number = 0
  ): number => {
    // Base imponible = Salario Bruto - ISSS - AFP - Otros descuentos no gravados
    const baseImponible = salarioBruto - descuentoISSS - descuentoAFP - otrosDescuentosNoGravados

    // Si la base imponible es <= $550, no hay renta
    if (baseImponible <= 550) {
      return 0
    }

    // Tramo 2: $550.01 - $895.24
    if (baseImponible <= 895.24) {
      return Math.round((17.67 + (baseImponible - 550) * 0.1) * 100) / 100
    }

    // Tramo 3: $895.25 - $2,038.10
    if (baseImponible <= 2038.1) {
      return Math.round((60 + (baseImponible - 895.24) * 0.2) * 100) / 100
    }

    // Tramo 4: $2,038.11 en adelante
    return Math.round((288.57 + (baseImponible - 2038.1) * 0.3) * 100) / 100
  }

  const calculatePayroll = (
    grossSalary: number,
    params: PayrollParameters,
    employeeAbsences: Absence[] = [],
    enableQuincena25: boolean = false
  ) => {
    let totalDeductions = 0
    const deductions: { [key: string]: number } = {}
    let quincena25Amount = 0

    // Calcular Quincena 25 si está habilitada (se suma al salario pero sin descuentos)
    if (enableQuincena25) {
      quincena25Amount = calcularQuincena25(grossSalary)
    }

    // Calcular ISSS automáticamente (no configurable) - sobre salario ordinario
    const descuentoISSS = calcularISSS(grossSalary)
    deductions['ISSS'] = descuentoISSS
    totalDeductions += descuentoISSS

    // Calcular otros descuentos configurables (AFP, etc.), excluyendo ISSS y RENTA
    let descuentoAFP = 0
    Object.entries(params).forEach(([name, param]) => {
      const nameLower = name.toLowerCase()
      
      // Saltar ISSS y RENTA, se calculan automáticamente
      if (nameLower.includes('isss') || nameLower.includes('renta')) {
        return
      }

      const value = param.value / 100 // Convert percentage to decimal
      const deduction = Math.round(grossSalary * value * 100) / 100

      deductions[name] = deduction
      totalDeductions += deduction

      // Track AFP for renta calculation
      if (nameLower.includes('afp')) {
        descuentoAFP = deduction
      }
    })

    // Calcular RENTA automáticamente usando los tramos (no configurable)
    const renta = calcularRenta(grossSalary, descuentoISSS, descuentoAFP, 0)
    deductions['RENTA'] = renta
    totalDeductions += renta

    // Calculate absence deduction (unpaid absences reduce salary)
    let absenceDeduction = 0
    if (employeeAbsences.length > 0) {
      // Get first day of month and last day of month
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      
      // Calculate work days in period (excluding weekends)
      let totalWorkDays = 0
      let currentDate = new Date(monthStart)
      while (currentDate <= monthEnd) {
        const dayOfWeek = currentDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          totalWorkDays++
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }

      absenceDeduction = calculateAbsenceDeduction(
        grossSalary,
        employeeAbsences,
        0, // worked days (not used, we calculate from absence)
        totalWorkDays
      )

      if (absenceDeduction > 0) {
        deductions['AUSENCIAS'] = absenceDeduction
        totalDeductions += absenceDeduction
      }
    }

    // Salary after absence deduction (but before calculating renta on reduced salary)
    const salaryAfterAbsences = Math.round((grossSalary - absenceDeduction) * 100) / 100
    
    // Recalculate RENTA if there are unpaid absences
    if (absenceDeduction > 0) {
      const newRenta = calcularRenta(salaryAfterAbsences, descuentoISSS, descuentoAFP, 0)
      if (newRenta !== renta) {
        deductions['RENTA'] = newRenta
        totalDeductions = totalDeductions - renta + newRenta
      }
    }

    const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100
    const totalIncome = Math.round((netSalary + quincena25Amount) * 100) / 100

    return {
      deductions,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary,
      quincena25: quincena25Amount,
      totalIncome,
      isss: descuentoISSS,
      afp: descuentoAFP,
      renta: deductions['RENTA'],
      absenceDeduction,
    }
  }

  const loadParametersFromDB = async (): Promise<PayrollParameters> => {
    try {
      const { data: parametersData } = await supabase
        .from('payroll_parameters')
        .select('*')

      const params: PayrollParameters = {}

      if (parametersData && parametersData.length > 0) {
        parametersData.forEach((param: any) => {
          params[param.parameter_name] = {
            parameter_name: param.parameter_name,
            value: param.value,
          }
        })
      }

      return params
    } catch (error) {
      console.error('[v0] Error loading parameters:', error)
      return {}
    }
  }

  // Validate if employee has at least 1 month of seniority
  const validateEmployeeAntiquity = (hireDate: string): boolean => {
    const hire = new Date(hireDate)
    const today = new Date()
    const diffTime = today.getTime() - hire.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 30
  }

  // Validate that payroll period is within employee's hire date
  const validatePayrollPeriodInRange = (hireDate: string, month: number, year: number): boolean => {
    const hire = new Date(hireDate)
    const hireYear = hire.getFullYear()
    const hireMonth = hire.getMonth() + 1

    // Period must be after or during hire date
    if (year < hireYear) return false
    if (year === hireYear && month < hireMonth) return false
    
    return true
  }

  const handleGeneratePayroll = async () => {
    try {
      setIsGenerating(true)
      if (selectedEmployees.length === 0) {
        toast({
          title: 'Advertencia',
          description: 'Selecciona al menos un empleado',
          variant: 'default',
        })
        setIsGenerating(false)
        return
      }

      // Validate employee antiquity
      const invalidAntiquityEmployees = selectedEmployees.filter((empId) => {
        const employee = employees.find((e) => e.id === empId)
        return employee && !validateEmployeeAntiquity(employee.hire_date)
      })

      if (invalidAntiquityEmployees.length > 0) {
        const names = invalidAntiquityEmployees
          .map((empId) => {
            const emp = employees.find((e) => e.id === empId)
            return `${emp?.first_name} ${emp?.last_name}`
          })
          .join(', ')
        toast({
          title: 'Antigüedad insuficiente',
          description: `${names} no tienen 1 mes de antigüedad. Solo se pueden generar planillas para empleados con al menos 30 días de contratación.`,
          variant: 'destructive',
        })
        return
      }

      // Validate that payroll period is within employee hire date range
      const invalidPeriodEmployees = selectedEmployees.filter((empId) => {
        const employee = employees.find((e) => e.id === empId)
        return employee && !validatePayrollPeriodInRange(employee.hire_date, month, year)
      })

      if (invalidPeriodEmployees.length > 0) {
        const names = invalidPeriodEmployees
          .map((empId) => {
            const emp = employees.find((e) => e.id === empId)
            return `${emp?.first_name} ${emp?.last_name}`
          })
          .join(', ')
        toast({
          title: 'Período de contratación inválido',
          description: `El período ${month}/${year} no está dentro del período de contratación de ${names}. Solo se pueden generar planillas para períodos posteriores a la fecha de contratación.`,
          variant: 'destructive',
        })
        return
      }

      // Load the latest parameters from DB
      const currentParams = await loadParametersFromDB()

      // Check if any parameters are configured
      const hasParameters = Object.keys(currentParams).length > 0

      if (!hasParameters) {
        toast({
          title: 'Advertencia',
          description: 'No hay descuentos configurados. Se generará la planilla solo con salario neto.',
          variant: 'default',
        })
      }

      // Check if trying to generate Quincena 25 outside of valid period
      const today = new Date()
      const currentDay = today.getDate()
      if (enableQuincena25 && !canGenerateQuincena25(month, currentDay)) {
        toast({
          title: 'Período inválido para Quincena 25',
          description: `Quincena 25 solo puede generarse en enero entre los días 15 y 25. Hoy es ${currentDay}/${month}/${year}. Por favor, intenta en el período permitido.`,
          variant: 'destructive',
        })
        return
      }

      const payrollsToInsert = selectedEmployees.map((employeeId) => {
        const employee = employees.find((e) => e.id === employeeId)
        if (!employee) return null

        // Get employee absences for this period
        const monthStart = new Date(year, month - 1, 1)
        const monthEnd = new Date(year, month, 0)
        const employeeAbsences = getEmployeeAbsencesInPeriod(
          absences,
          employeeId,
          monthStart,
          monthEnd
        )

        const result = calculatePayroll(employee.salary, currentParams, employeeAbsences, enableQuincena25)

        // Initialize base payload with standard fields
        // Note: other_deductions should only contain absences, Quincena 25 is added to net_salary
        const payload: any = {
          employee_id: employeeId,
          payroll_period_month: month,
          payroll_period_year: year,
          gross_salary: employee.salary,
          isapres: result.isss,
          afp: result.afp,
          renta: result.renta,
          other_deductions: result.absenceDeduction || 0,
          net_salary: result.totalIncome, // Total income includes Quincena 25 if applicable
          status: 'draft',
        }

        return payload
      })

      const { data: insertedPayrolls, error } = await supabase
        .from('payroll_records')
        .insert(payrollsToInsert.filter(Boolean))
        .select('id, employee_id, gross_salary, payroll_period_month, payroll_period_year')

      if (error) throw error

      // Generate employer costs for each payroll record
      if (insertedPayrolls && insertedPayrolls.length > 0) {
        // Get employer cost parameters from database
        const { data: employerParams } = await supabase
          .from('payroll_parameters')
          .select('*')
          .in('parameter_name', ['ISSS_EMPLOYER', 'AFP_EMPLOYER'])
        
        // Set default values if not found
        const isssEmployerRate = employerParams?.find((p: any) => p.parameter_name === 'ISSS_EMPLOYER')?.value || 0.075
        const afpEmployerRate = employerParams?.find((p: any) => p.parameter_name === 'AFP_EMPLOYER')?.value || 0.0875

        const employerCostsToInsert = insertedPayrolls.map((payroll) => ({
          payroll_id: payroll.id,
          employee_id: payroll.employee_id,
          payroll_period_month: payroll.payroll_period_month,
          payroll_period_year: payroll.payroll_period_year,
          salary_base: payroll.gross_salary,
          isss_employer: parseFloat((payroll.gross_salary * isssEmployerRate).toFixed(2)),
          afp_employer: parseFloat((payroll.gross_salary * afpEmployerRate).toFixed(2)),
          employer_total_cost: parseFloat((payroll.gross_salary * (1 + isssEmployerRate + afpEmployerRate)).toFixed(2)),
        }))

        const { error: costError } = await supabase
          .from('employer_costs')
          .insert(employerCostsToInsert)

        if (costError) {
          console.error('[v0] Error inserting employer costs:', costError)
          throw costError
        }
      }

      setSelectedEmployees([])
      setIsGenerating(false)
      
      // Wait a moment then refresh data and close dialog
      setTimeout(async () => {
        await fetchAllData()
        setIsDialogOpen(false)
        toast({
          title: 'Éxito',
          description: 'Planilla y costos patronales generados exitosamente',
        })
      }, 500)
    } catch (error) {
      setIsGenerating(false)
      console.error('[v0] Error generating payroll:', error)
      toast({
        title: 'Error',
        description: `Error al generar la planilla: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive',
      })
    }
  }

  const handleApprovePayroll = async (recordId: string) => {
    try {
      setIsApproving(true)
      const { error } = await supabase
        .from('payroll_records')
        .update({ status: 'approved' })
        .eq('id', recordId)

      if (error) throw error
      
      setDetailModalOpen(false)
      setSelectedPayroll(null)
      fetchAllData()
      toast({
        title: 'Éxito',
        description: 'Planilla aprobada exitosamente',
      })
    } catch (error) {
      console.error('Error approving payroll:', error)
      toast({
        title: 'Error',
        description: 'Error al aprobar la planilla',
        variant: 'destructive',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleDeletePayroll = async (recordId: string) => {
    if (!window.confirm('¿Deseas eliminar este registro de planilla?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('payroll_records')
        .delete()
        .eq('id', recordId)

      if (error) throw error
      fetchAllData()
    } catch (error) {
      console.error('Error deleting payroll:', error)
    }
  }

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'letter')
    const now = new Date()
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNames[month - 1]
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const filteredRecords = payrollRecords.filter(
      (r) => r.payroll_period_month === month && r.payroll_period_year === year
    )

    if (filteredRecords.length === 0) {
      doc.text('No hay registros de planilla para este período', 15, 50)
      doc.save(`planilla-${month}-${year}.pdf`)
      return
    }

    const addHeader = (pageNum: number) => {
      // Colored header bar
      doc.setFillColor(31, 56, 100)
      doc.rect(0, 0, pageWidth, 35, 'F')

      // Company name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Asociación Comunal Aguas del Tecomasuchi, C.A.', 15, 12)

      // Document title and period
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`PLANILLA DE SALARIOS - ${monthName.toUpperCase()} ${year}`, 15, 23)

      // Right side info
      doc.setFontSize(8)
      doc.setTextColor(220, 220, 220)
      const rightCol = pageWidth - 40
      doc.text(`Período: ${monthName} ${year}`, rightCol, 12)
      doc.text(`Generado: ${now.toLocaleDateString('es-SV')}`, rightCol, 17)
      doc.text(`Hora: ${now.toLocaleTimeString('es-SV')}`, rightCol, 22)
    }

    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setDrawColor(200, 200, 200)
      doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12)
      doc.text(
        `Página ${pageNum} de ${totalPages} | Sistema de Gestión de Planillas | ${now.toLocaleDateString('es-SV')}`,
        15,
        pageHeight - 8
      )
    }

    // Add header to first page
    addHeader(1)

    let yPosition = 42
    doc.setTextColor(0, 0, 0)

    // === SUMMARY SECTION ===
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DEL PERÍODO', 15, yPosition)
    yPosition += 7

    // Calculate summary totals
    const summary = filteredRecords.reduce(
      (acc, record) => ({
        totalEmployees: acc.totalEmployees + 1,
        totalGross: acc.totalGross + record.gross_salary,
        totalISS: acc.totalISS + record.isapres,
        totalAFP: acc.totalAFP + record.afp,
        totalRENTA: acc.totalRENTA + record.renta,
        totalNet: acc.totalNet + record.net_salary,
      }),
      {
        totalEmployees: 0,
        totalGross: 0,
        totalISS: 0,
        totalAFP: 0,
        totalRENTA: 0,
        totalNet: 0,
      }
    )

    // Summary grid (2 columns)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const col1 = 15
    const col2 = 110
    
    doc.text(`Total de Empleados:`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`${summary.totalEmployees}`, col2, yPosition)
    yPosition += 5

    doc.setFont('helvetica', 'normal')
    doc.text(`Salario Base Total:`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${summary.totalGross.toFixed(2)}`, col2, yPosition)
    yPosition += 5

    doc.setFont('helvetica', 'normal')
    doc.text(`Total ISSS:`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${summary.totalISS.toFixed(2)}`, col2, yPosition)
    yPosition += 5

    doc.setFont('helvetica', 'normal')
    doc.text(`Total AFP:`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${summary.totalAFP.toFixed(2)}`, col2, yPosition)
    yPosition += 5

    doc.setFont('helvetica', 'normal')
    doc.text(`Total RENTA:`, col1, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${summary.totalRENTA.toFixed(2)}`, col2, yPosition)
    yPosition += 7

    // Total NET highlight
    doc.setFillColor(200, 215, 240)
    doc.rect(15, yPosition - 4, pageWidth - 30, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(31, 56, 100)
    doc.text('TOTAL A PAGAR NETO:', col1, yPosition + 2)
    doc.text(`$${summary.totalNet.toFixed(2)}`, col2, yPosition + 2)
    yPosition += 12

    // === DETAIL TABLE ===
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('DETALLE DE EMPLEADOS', 15, yPosition)
    yPosition += 6

    // Table setup - optimized for letter page
    const headers = ['Empleado', 'Cédula', 'Salario', 'ISSS', 'AFP', 'RENTA', 'Neto']
    const columnWidths = [30, 18, 20, 16, 16, 16, 25]
    const tableStartX = 12
    const tableStartY = yPosition
    const totalTableWidth = columnWidths.reduce((a, b) => a + b, 0)

    // Draw table header
    doc.setFillColor(31, 56, 100)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')

    let currentX = tableStartX
    headers.forEach((header, i) => {
      doc.rect(currentX, tableStartY, columnWidths[i], 7, 'F')
      doc.text(header, currentX + columnWidths[i] / 2, tableStartY + 4.5, {
        align: 'center',
      })
      currentX += columnWidths[i]
    })

    yPosition = tableStartY + 7
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)

    // Draw table rows
    let rowCount = 0
    filteredRecords.forEach((record) => {
      const employee = employees.find((e) => e.id === record.employee_id)
      if (!employee) return

      // Check if we need a new page
      if (yPosition > pageHeight - 18) {
        addFooter(doc.internal.getNumberOfPages(), 1)
        doc.addPage()
        addHeader(doc.internal.getNumberOfPages())
        
        // Redraw table header on new page
        doc.setFillColor(31, 56, 100)
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        currentX = tableStartX
        headers.forEach((header, i) => {
          doc.rect(currentX, 45, columnWidths[i], 6.5, 'F')
          doc.text(header, currentX + 0.5, 49.2, {
            maxWidth: columnWidths[i] - 1,
            align: 'center',
          })
          currentX += columnWidths[i]
        })
        
        yPosition = 52
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
      }

      // Alternate row background
      if (rowCount % 2 === 0) {
        doc.setFillColor(245, 245, 245)
        doc.rect(tableStartX, yPosition - 2.5, totalTableWidth, 5, 'F')
      }

      const values = [
        `${employee.first_name} ${employee.last_name}`,
        employee.cedula || 'N/A',
        `$${record.gross_salary.toFixed(2)}`,
        `$${record.isapres.toFixed(2)}`,
        `$${record.afp.toFixed(2)}`,
        `$${record.renta.toFixed(2)}`,
        `$${record.net_salary.toFixed(2)}`,
      ]

      doc.setTextColor(0, 0, 0)
      currentX = tableStartX
      values.forEach((value, i) => {
        const isNumeric = i > 1
        const align = isNumeric ? 'right' : 'left'
        const xOffset = isNumeric ? columnWidths[i] - 0.5 : 0.5
        
        doc.text(value, currentX + xOffset, yPosition, {
          maxWidth: columnWidths[i] - 1,
          align: align,
        })
        currentX += columnWidths[i]
      })

      yPosition += 5
      rowCount++
    })

    // Add footers to all pages
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      addFooter(i, totalPages)
    }

    doc.save(`planilla-${monthName}-${year}.pdf`)
  }

  const exportToExcel = () => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNames[month - 1]

    const filteredRecords = payrollRecords.filter(
      (r) => r.payroll_period_month === month && r.payroll_period_year === year
    )

    if (filteredRecords.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay registros de planilla para exportar',
        variant: 'destructive',
      })
      return
    }

    // Calculate summary totals
    const summary = filteredRecords.reduce(
      (acc, record) => ({
        totalEmployees: acc.totalEmployees + 1,
        totalGross: acc.totalGross + record.gross_salary,
        totalISS: acc.totalISS + record.isapres,
        totalAFP: acc.totalAFP + record.afp,
        totalRENTA: acc.totalRENTA + record.renta,
        totalNet: acc.totalNet + record.net_salary,
      }),
      {
        totalEmployees: 0,
        totalGross: 0,
        totalISS: 0,
        totalAFP: 0,
        totalRENTA: 0,
        totalNet: 0,
      }
    )

    // Prepare data for Excel
    const data: any[] = []

    // Add header info
    data.push(['PLANILLA DE SALARIOS'])
    data.push(['Asociación Comunal Aguas del Tecomasuchi, C.A.'])
    data.push([`Período: ${monthName} ${year}`])
    data.push([`Generado: ${new Date().toLocaleDateString('es-SV')}`])
    data.push([])

    // Add summary
    data.push(['RESUMEN DEL PERÍODO'])
    data.push(['Total de Empleados:', summary.totalEmployees])
    data.push(['Salario Base Total:', summary.totalGross])
    data.push(['Total ISSS:', summary.totalISS])
    data.push(['Total AFP:', summary.totalAFP])
    data.push(['Total RENTA:', summary.totalRENTA])
    data.push(['TOTAL A PAGAR:', summary.totalNet])
    data.push([])

    // Add employee details
    data.push(['DETALLE DE EMPLEADOS'])
    data.push([
      'Empleado',
      'Cédula',
      'Salario Base',
      'ISSS',
      'AFP',
      'RENTA',
      'Otros Descuentos',
      'Salario Neto',
      'Estado',
    ])

    filteredRecords.forEach((record) => {
      const employee = employees.find((e) => e.id === record.employee_id)
      if (!employee) return

      data.push([
        `${employee.first_name} ${employee.last_name}`,
        employee.cedula || 'N/A',
        record.gross_salary,
        record.isapres,
        record.afp,
        record.renta,
        record.other_deductions,
        record.net_salary,
        record.status,
      ])
    })

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(data)
    
    // Set column widths
    const colWidths = [25, 18, 20, 15, 15, 15, 18, 18, 15]
    ws['!cols'] = colWidths.map((width) => ({ wch: width }))

    // Style header rows
    const headerRows = [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 13]
    headerRows.forEach((rowIdx) => {
      for (let colIdx = 0; colIdx < 9; colIdx++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: '1F3864' }, patternType: 'solid' },
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' },
          }
        }
      }
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Planilla')
    XLSX.writeFile(wb, `planilla-${monthName}-${year}.xlsx`)

    toast({
      title: 'Éxito',
      description: 'Planilla exportada a Excel correctamente',
    })
  }

  const openDetailModal = (record: PayrollRecord) => {
    setSelectedPayroll(record)
    setDetailModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start md:items-center gap-4 flex-col md:flex-row">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-green-600" size={32} />
            Planillas
          </h1>
          <p className="text-gray-600 mt-1">
            Genera y gestiona las planillas de salarios
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700">
              <Plus size={20} className="mr-2" />
              Generar Planilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generar Nueva Planilla</DialogTitle>
              <DialogDescription>
                Selecciona el período y los empleados para generar la planilla
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month">Mes *</Label>
                  <Select value={month.toString()} onValueChange={(m) => setMonth(parseInt(m))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(2024, m - 1).toLocaleString('es-SV', {
                            month: 'long',
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">Año *</Label>
                  <Select value={year.toString()} onValueChange={(y) => setYear(parseInt(y))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) =>
                        new Date().getFullYear() - i
                      ).map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Selecciona Empleados *</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees([
                              ...selectedEmployees,
                              emp.id,
                            ])
                          } else {
                            setSelectedEmployees(
                              selectedEmployees.filter((id) => id !== emp.id)
                            )
                          }
                        }}
                      />
                      <span>
                        {emp.first_name} {emp.last_name} - ${emp.salary.toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <input
                    type="checkbox"
                    checked={enableQuincena25}
                    onChange={(e) => setEnableQuincena25(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="font-medium text-amber-900">
                      Incluir Quincena 25
                    </span>
                    <p className="text-sm text-amber-700 mt-1">
                      Beneficio del 50% del salario para empleados con salario ≤ $1,500 (solo entre 15-25 enero)
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-emerald-600"
                  onClick={handleGeneratePayroll}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generando...' : 'Generar Planilla'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Export Section */}
      {payrollRecords.length > 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="text-base">Exportar Planilla</CardTitle>
            <CardDescription>
              Mes: {month} | Año: {year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={exportToPDF}
                className="flex items-center gap-2"
              >
                <Download size={18} />
                Exportar a PDF
              </Button>
              <Button
                variant="outline"
                onClick={exportToExcel}
                className="flex items-center gap-2"
              >
                <Download size={18} />
                Exportar a Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Records */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando planillas...</p>
        </div>
      ) : payrollRecords.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              No hay planillas registradas
            </p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-emerald-600"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus size={20} className="mr-2" />
              Generar Primera Planilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Empleado
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Período
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Salario Base
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">ISSS</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">AFP</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">RENTA</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Salario Neto
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Estado
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {payrollRecords.map((record) => {
                const employee = employees.find((e) => e.id === record.employee_id)
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {employee?.first_name} {employee?.last_name}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {record.payroll_period_month}/{record.payroll_period_year}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      ${record.gross_salary.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ${(record.isapres || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ${(record.afp || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ${(record.renta || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      ${record.net_salary.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : record.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {record.status === 'approved'
                          ? 'Aprobado'
                          : record.status === 'draft'
                            ? 'Borrador'
                            : 'Pagado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailModal(record)}
                          className="flex items-center gap-1"
                        >
                          <Eye size={16} />
                          Detalle
                        </Button>
                        {record.status === 'draft' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() =>
                              handleApprovePayroll(record.id)
                            }
                          >
                            <CheckCircle2 size={16} className="mr-1" />
                            Aprobar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => handleDeletePayroll(record.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPayroll && (
        <PayrollDetailModal
          isOpen={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          employeeName={
            employees.find((e) => e.id === selectedPayroll.employee_id)
              ? `${employees.find((e) => e.id === selectedPayroll.employee_id)?.first_name} ${employees.find((e) => e.id === selectedPayroll.employee_id)?.last_name}`
              : ''
          }
          period={`${selectedPayroll.payroll_period_month}/${selectedPayroll.payroll_period_year}`}
          payrollData={selectedPayroll}
          onApprove={() => handleApprovePayroll(selectedPayroll.id)}
          isApproving={isApproving}
        />
      )}
    </div>
  )
}
