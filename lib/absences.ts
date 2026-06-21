// Types
export interface Absence {
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
  created_at?: string
  updated_at?: string
}

// Calculate days between two dates
export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
  return Math.max(diffDays, 1)
}

// Get absences for specific employee and period
export const getEmployeeAbsencesInPeriod = (
  absences: Absence[],
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Absence[] => {
  return absences.filter((absence) => {
    if (absence.employee_id !== employeeId) return false
    if (absence.status !== 'approved') return false

    const absenceStart = new Date(absence.start_date)
    const absenceEnd = new Date(absence.end_date)

    // Check if absence overlaps with the period
    return absenceStart <= periodEnd && absenceEnd >= periodStart
  })
}

// Calculate worked days in a period considering absences
export const calculateWorkedDays = (
  periodStart: Date,
  periodEnd: Date,
  absences: Absence[]
): number => {
  // Calculate total days in period (excluding weekends)
  let totalDays = 0
  let currentDate = new Date(periodStart)

  while (currentDate <= periodEnd) {
    const dayOfWeek = currentDate.getDay()
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      totalDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Subtract approved absence days (excluding unpaid absences)
  let absenceDays = 0
  absences.forEach((absence) => {
    if (absence.status === 'approved') {
      absenceDays += absence.days_quantity
    }
  })

  return Math.max(totalDays - absenceDays, 0)
}

// Calculate salary adjustment based on absences
export const calculateAbsenceDeduction = (
  grossSalary: number,
  absences: Absence[],
  workedDays: number,
  totalWorkDaysInPeriod: number
): number => {
  if (totalWorkDaysInPeriod === 0) return 0

  // Calculate unpaid absence days
  let unpaidAbsenceDays = 0
  absences.forEach((absence) => {
    if (!absence.is_paid && absence.status === 'approved') {
      unpaidAbsenceDays += absence.days_quantity
    }
  })

  if (unpaidAbsenceDays === 0) return 0

  // Calculate daily salary
  const dailySalary = grossSalary / totalWorkDaysInPeriod
  return unpaidAbsenceDays * dailySalary
}
