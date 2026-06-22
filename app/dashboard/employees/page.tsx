'use client'

import { useEffect, useState } from 'react'
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
import { Plus, Edit2, Trash2, Users } from 'lucide-react'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  cedula: string
  position_id: string
  role_id: string
  administrative_unit_id: string
  salary: number
  hire_date: string
  status: string
  created_at: string
}

interface Position {
  id: string
  name: string
}

interface Role {
  id: string
  name: string
}

interface AdministrativeUnit {
  id: string
  name: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [units, setUnits] = useState<AdministrativeUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cedula: '',
    position_id: '',
    role_id: '',
    administrative_unit_id: '',
    salary: '',
    hire_date: '',
    status: 'active',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [
        { data: employeesData },
        { data: positionsData },
        { data: rolesData },
        { data: unitsData },
      ] = await Promise.all([
        supabase
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('positions').select('*'),
        supabase.from('roles').select('*'),
        supabase.from('administrative_units').select('*'),
      ])

      setEmployees(employeesData || [])
      setPositions(positionsData || [])
      setRoles(rolesData || [])
      setUnits(unitsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (
      !formData.first_name.trim() ||
      !formData.last_name.trim() ||
      !formData.cedula.trim() ||
      !formData.position_id ||
      !formData.role_id ||
      !formData.administrative_unit_id ||
      !formData.salary ||
      !formData.hire_date
    ) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        cedula: formData.cedula,
        position_id: formData.position_id,
        role_id: formData.role_id,
        administrative_unit_id: formData.administrative_unit_id,
        salary: parseFloat(formData.salary),
        hire_date: formData.hire_date,
        status: formData.status,
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        const { error } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([updateData])

        if (error) throw error
      }

      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        cedula: '',
        position_id: '',
        role_id: '',
        administrative_unit_id: '',
        salary: '',
        hire_date: '',
        status: 'active',
      })
      setEditingId(null)
      setIsDialogOpen(false)
      fetchAllData()
    } catch (error) {
      console.error('Error saving employee:', error)
      alert('Error al guardar el empleado')
    }
  }

  const handleEdit = (employee: Employee) => {
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email || '',
      phone: employee.phone || '',
      cedula: employee.cedula,
      position_id: employee.position_id,
      role_id: employee.role_id,
      administrative_unit_id: employee.administrative_unit_id,
      salary: employee.salary.toString(),
      hire_date: employee.hire_date,
      status: employee.status,
    })
    setEditingId(employee.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchAllData()
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert('Error al eliminar el empleado')
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        cedula: '',
        position_id: '',
        role_id: '',
        administrative_unit_id: '',
        salary: '',
        hire_date: '',
        status: 'active',
      })
      setEditingId(null)
    }
    setIsDialogOpen(open)
  }

  const getPositionName = (id: string) =>
    positions.find((p) => p.id === id)?.name || '—'
  const getRoleName = (id: string) => roles.find((r) => r.id === id)?.name || '—'
  const getUnitName = (id: string) => units.find((u) => u.id === id)?.name || '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start md:items-center gap-4 flex-col md:flex-row">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" size={32} />
            Empleados
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona toda la información de los empleados
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700">
              <Plus size={20} className="mr-2" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Actualiza los detalles del empleado'
                  : 'Registra un nuevo empleado en el sistema'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name">Nombre *</Label>
                  <Input
                    id="first_name"
                    placeholder="Juan"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Apellido *</Label>
                  <Input
                    id="last_name"
                    placeholder="Pérez"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cedula">DUI *</Label>
                  <Input
                    id="cedula"
                    placeholder="12345678-9"
                    value={formData.cedula}
                    onChange={(e) =>
                      setFormData({ ...formData, cedula: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Salario *</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) =>
                      setFormData({ ...formData, salary: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="juan@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="+503 XXXX-XXXX"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="hire_date">Fecha de Contratación *</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) =>
                    setFormData({ ...formData, hire_date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="administrative_unit_id">
                  Unidad Administrativa *
                </Label>
                <Select
                  value={formData.administrative_unit_id}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      administrative_unit_id: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="position_id">Puesto *</Label>
                <Select
                  value={formData.position_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, position_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="role_id">Cargo *</Label>
                <Select
                  value={formData.role_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Estado *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="suspended">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-emerald-600"
                  onClick={handleSave}
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employees List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando empleados...</p>
        </div>
      ) : employees.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              No hay empleados registrados
            </p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-emerald-600"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus size={20} className="mr-2" />
              Registrar Primer Empleado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  DUI
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Puesto
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Área
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Salario
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
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {employee.first_name} {employee.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{employee.cedula}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {getPositionName(employee.position_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {getUnitName(employee.administrative_unit_id)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ${parseFloat(employee.salary.toString()).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        employee.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : employee.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {employee.status === 'active'
                        ? 'Activo'
                        : employee.status === 'inactive'
                          ? 'Inactivo'
                          : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(employee)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => handleDelete(employee.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
