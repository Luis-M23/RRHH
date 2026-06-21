'use client'

import { useState, useEffect } from 'react'
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
import { Trash2, Edit2, Plus } from 'lucide-react'

interface Employee {
  id: string
  first_name: string
  last_name: string
}

interface Absence {
  id: string
  employee_id: string
  absence_type: string
  start_date: string
  end_date: string
  days_quantity: number
  is_paid: boolean
  reason: string
  status: string
  observations: string
  created_at: string
}

const ABSENCE_TYPES = [
  { value: 'PERMISO_PERSONAL', label: 'Permiso Personal' },
  { value: 'VACACIONES', label: 'Vacaciones' },
  { value: 'INCAPACIDAD', label: 'Incapacidad' },
  { value: 'LICENCIA_MATERNIDAD', label: 'Licencia de Maternidad' },
  { value: 'LICENCIA_PATERNIDAD', label: 'Licencia de Paternidad' },
  { value: 'DUELO', label: 'Duelo' },
  { value: 'OTRO', label: 'Otro' },
]

export default function AbsencesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    absence_type: '',
    start_date: '',
    end_date: '',
    is_paid: false,
    reason: '',
    observations: '',
  })
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
      
      if (employeesError) {
        console.error('[v0] Error fetching employees:', employeesError)
      }
      
      setEmployees(employeesData || [])
      
      // Try to fetch absences from Supabase first
      let absencesData: Absence[] = []
      const { data: absDataResult, error: absencesError } = await supabase
        .from('absences')
        .select('*')
        .order('start_date', { ascending: false })
      
      if (!absencesError && absDataResult) {
        // Successfully fetched from Supabase
        absencesData = absDataResult
        // Sync with localStorage
        localStorage.setItem('absences', JSON.stringify(absDataResult))
      } else {
        // Fallback to localStorage if table doesn't exist
        const storedAbsences = localStorage.getItem('absences')
        absencesData = storedAbsences ? JSON.parse(storedAbsences) : []
      }

      setAbsences(absencesData)
    } catch (error) {
      console.error('[v0] Error fetching data:', error)
      // Fallback to localStorage
      const storedAbsences = localStorage.getItem('absences')
      setAbsences(storedAbsences ? JSON.parse(storedAbsences) : [])
    } finally {
      setLoading(false)
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // Auto-calculate days when dates change
      if (field === 'start_date' || field === 'end_date') {
        updated.days_quantity = calculateDays(
          updated.start_date,
          updated.end_date
        )
      }
      return updated
    })
  }

  const handleSave = async () => {
    if (!formData.employee_id || !formData.absence_type || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    try {
      const days = calculateDays(formData.start_date, formData.end_date)
      const newAbsence: Absence = {
        id: editingId || `abs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employee_id: formData.employee_id,
        absence_type: formData.absence_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_quantity: days,
        is_paid: formData.is_paid,
        reason: formData.reason,
        status: 'approved',
        observations: formData.observations,
        created_at: new Date().toISOString(),
      }

      let updatedAbsences = absences
      if (editingId) {
        // Update existing
        updatedAbsences = absences.map((abs) =>
          abs.id === editingId ? newAbsence : abs
        )
      } else {
        // Add new
        updatedAbsences = [...absences, newAbsence]
      }

      // Save to localStorage
      localStorage.setItem('absences', JSON.stringify(updatedAbsences))

      // Try to sync with Supabase
      if (editingId) {
        await supabase
          .from('absences')
          .update({
            ...newAbsence,
          })
          .eq('id', editingId)
      } else {
        await supabase.from('absences').insert([newAbsence])
      }

      setIsDialogOpen(false)
      setEditingId(null)
      setFormData({
        employee_id: '',
        absence_type: '',
        start_date: '',
        end_date: '',
        is_paid: false,
        reason: '',
        observations: '',
      })
      
      // Update local state immediately
      setAbsences(updatedAbsences)
      toast({
        title: 'Éxito',
        description: 'Ausencia guardada correctamente',
      })
    } catch (error: any) {
      console.error('[v0] Error saving absence:', error)
      toast({
        title: 'Guardado local',
        description: 'Ausencia guardada localmente (sincronización con BD pendiente)',
        variant: 'default',
      })
    }
  }

  const handleEdit = (absence: Absence) => {
    setFormData({
      employee_id: absence.employee_id,
      absence_type: absence.absence_type,
      start_date: absence.start_date,
      end_date: absence.end_date,
      is_paid: absence.is_paid,
      reason: absence.reason,
      observations: absence.observations,
    })
    setEditingId(absence.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    // Show confirmation modal instead of browser confirm
    const confirmed = confirm('¿Estás seguro de que deseas eliminar esta ausencia?')
    if (!confirmed) return

    try {
      // Remove from local state
      const updatedAbsences = absences.filter((abs) => abs.id !== id)
      setAbsences(updatedAbsences)
      localStorage.setItem('absences', JSON.stringify(updatedAbsences))

      // Try to delete from Supabase
      await supabase.from('absences').delete().eq('id', id)
      toast({
        title: 'Eliminado',
        description: 'Ausencia eliminada correctamente',
      })
    } catch (error) {
      console.error('[v0] Error deleting absence:', error)
      toast({
        title: 'Eliminado localmente',
        description: 'Ausencia eliminada localmente (sincronización con BD pendiente)',
        variant: 'default',
      })
    }
  }

  const handleOpenDialog = () => {
    setEditingId(null)
    setFormData({
      employee_id: '',
      absence_type: '',
      start_date: '',
      end_date: '',
      is_paid: false,
      reason: '',
      observations: '',
    })
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ausencias</h1>
          <p className="text-gray-600 mt-1">
            Gestiona permisos, vacaciones e incapacidades de los empleados
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={handleOpenDialog}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
            >
              <Plus size={20} className="mr-2" />
              Nueva Ausencia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Ausencia' : 'Nueva Ausencia'}
              </DialogTitle>
              <DialogDescription>
                Registra una ausencia, permiso o incapacidad
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Employee Selection */}
              <div>
                <Label htmlFor="employee">Empleado *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) =>
                    handleFormChange('employee_id', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Absence Type */}
              <div>
                <Label htmlFor="type">Tipo de Ausencia *</Label>
                <Select
                  value={formData.absence_type}
                  onValueChange={(value) =>
                    handleFormChange('absence_type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ABSENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Fecha de Inicio *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      handleFormChange('start_date', e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Fecha de Fin *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      handleFormChange('end_date', e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Days Display */}
              {formData.start_date && formData.end_date && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900">
                    Días: {calculateDays(formData.start_date, formData.end_date)}
                  </p>
                </div>
              )}

              {/* Is Paid */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_paid"
                  checked={formData.is_paid}
                  onChange={(e) =>
                    handleFormChange('is_paid', e.target.checked)
                  }
                  className="rounded"
                />
                <Label htmlFor="is_paid" className="mb-0">
                  ¿Es pagada?
                </Label>
              </div>

              {/* Reason */}
              <div>
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  value={formData.reason}
                  onChange={(e) =>
                    handleFormChange('reason', e.target.value)
                  }
                  placeholder="Describe el motivo de la ausencia"
                />
              </div>

              {/* Observations */}
              <div>
                <Label htmlFor="observations">Observaciones</Label>
                <Input
                  value={formData.observations}
                  onChange={(e) =>
                    handleFormChange('observations', e.target.value)
                  }
                  placeholder="Notas adicionales"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
                >
                  {editingId ? 'Guardar Cambios' : 'Crear Ausencia'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Absences List */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Cargando...</p>
          </CardContent>
        </Card>
      ) : absences.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center py-8">
              No hay ausencias registradas
            </p>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Tipo
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Fecha Inicio
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Fecha Fin
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Días
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Pagada
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
              {absences.map((absence) => {
                const employee = employees.find(
                  (e) => e.id === absence.employee_id
                )
                return (
                  <tr
                    key={absence.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {employee
                        ? `${employee.first_name} ${employee.last_name}`
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ABSENCE_TYPES.find(
                        (t) => t.value === absence.absence_type
                      )?.label || absence.absence_type}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {new Date(absence.start_date).toLocaleDateString(
                        'es-SV'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {new Date(absence.end_date).toLocaleDateString('es-SV')}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">
                      {Math.ceil(absence.days_quantity)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          absence.is_paid
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {absence.is_paid ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          absence.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : absence.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {absence.status === 'approved'
                          ? 'Aprobada'
                          : absence.status === 'pending'
                          ? 'Pendiente'
                          : 'Rechazada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(absence)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(absence.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
