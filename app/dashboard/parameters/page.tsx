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
import { Trash2, Plus, Edit2 } from 'lucide-react'

interface PayrollParameter {
  id: string
  parameter_name: string
  value: number
  description: string
  effective_date: string
}

export default function ParametersPage() {
  const [parameters, setParameters] = useState<PayrollParameter[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    parameter_name: '',
    value: '',
    description: '',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchParameters()
  }, [])

  const fetchParameters = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payroll_parameters')
        .select('*')
        .order('parameter_name', { ascending: true })

      if (error) throw error
      setParameters(data || [])
    } catch (error) {
      console.error('[v0] Error fetching parameters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'value'
          ? parseFloat(value) || ''
          : value,
    }))
  }

  const handleAddEdit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.parameter_name || !formData.value || !formData.description) {
      alert('Por favor completa todos los campos')
      return
    }

    // Validar que no se intente crear ISSS o RENTA (son automáticos)
    const nameLower = formData.parameter_name.toLowerCase()
    if (nameLower.includes('isss') || nameLower.includes('renta')) {
      alert('ISSS y RENTA se calculan automáticamente y no pueden ser configurados manualmente.')
      return
    }

    try {
      if (isEditing && editingId) {
        const { error } = await supabase
          .from('payroll_parameters')
          .update({
            parameter_name: formData.parameter_name,
            value: parseFloat(formData.value as any),
            description: formData.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('payroll_parameters')
          .insert({
            parameter_name: formData.parameter_name,
            value: parseFloat(formData.value as any),
            description: formData.description,
          })

        if (error) throw error
      }

      setFormData({
        parameter_name: '',
        value: '',
        description: '',
      })
      setIsEditing(false)
      setEditingId(null)
      setIsDialogOpen(false)
      await fetchParameters()
    } catch (error) {
      console.error('[v0] Error saving parameter:', error)
      alert('Error al guardar el parámetro')
    }
  }

  const handleEdit = (parameter: PayrollParameter) => {
    setFormData({
      parameter_name: parameter.parameter_name,
      value: parameter.value.toString(),
      description: parameter.description,
    })
    setEditingId(parameter.id)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este parámetro?')) return

    try {
      const { error } = await supabase
        .from('payroll_parameters')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchParameters()
    } catch (error) {
      console.error('[v0] Error deleting parameter:', error)
      alert('Error al eliminar el parámetro')
    }
  }

  const handleOpenDialog = () => {
    setFormData({
      parameter_name: '',
      value: '',
      description: '',
    })
    setIsEditing(false)
    setEditingId(null)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setEditingId(null)
    setFormData({
      parameter_name: '',
      value: '',
      description: '',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Cargando parámetros...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Parámetros de Descuentos
          </h1>
          <p className="text-gray-600 mt-2">
            Administra los porcentajes y tasas de descuentos para el cálculo de planillas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={handleOpenDialog}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
            >
              <Plus size={20} className="mr-2" />
              Nuevo Descuento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Editar Descuento' : 'Nuevo Descuento'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Modifica los datos del descuento'
                  : 'Crea un nuevo parámetro de descuento para la planilla'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEdit} className="space-y-4">
              <div>
                <Label htmlFor="parameter_name" className="font-medium">
                  Nombre del Descuento
                </Label>
                <Input
                  id="parameter_name"
                  name="parameter_name"
                  placeholder="Ej: ISSS, AFP, ISAPRES, RENTA, etc."
                  value={formData.parameter_name}
                  onChange={handleInputChange}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="value" className="font-medium">
                  Porcentaje (%)
                </Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Ej: 7.5"
                  value={formData.value}
                  onChange={handleInputChange}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="description" className="font-medium">
                  Descripción
                </Label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Descripción del descuento"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
                >
                  {isEditing ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Parameters List */}
      {parameters.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No hay parámetros de descuentos configurados
              </p>
              <Button
                onClick={handleOpenDialog}
                className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
              >
                <Plus size={20} className="mr-2" />
                Crear Primer Descuento
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {parameters.map((param) => (
            <Card key={param.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {param.parameter_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {param.description}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      {param.value}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Vigente desde: {new Date(param.effective_date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(param)}
                  className="gap-2"
                >
                  <Edit2 size={16} />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(param.id)}
                >
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Automatic Deductions Info */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="text-emerald-900">
            Descuentos Automáticos (Calculados por Ley)
          </CardTitle>
          <CardDescription className="text-emerald-700">
            Estos descuentos se calculan automáticamente según la ley salvadoreña y no pueden ser modificados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ISSS */}
          <div className="bg-white p-4 rounded-lg border border-emerald-200">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-emerald-900">ISSS</h4>
                <p className="text-sm text-emerald-700 mt-1">
                  Fórmula: mín(salarioBase × 0.03, $30.00)
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  Instituto Salvadoreño del Seguro Social - Descuento laboral del empleado
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">3%</p>
                <p className="text-xs text-emerald-600 mt-1">Techo: $30.00</p>
              </div>
            </div>
          </div>

          {/* RENTA */}
          <div className="bg-white p-4 rounded-lg border border-emerald-200">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-emerald-900">RENTA (ISR)</h4>
                <p className="text-sm text-emerald-700 mt-1">
                  Tramos progresivos - Decreto Ejecutivo No. 10 de 2025
                </p>
                <div className="text-xs text-emerald-600 mt-2 space-y-1">
                  <p>• Hasta $550: $0</p>
                  <p>• $550.01-$895.24: $17.67 + 10% sobre excedente</p>
                  <p>• $895.25-$2,038.10: $60 + 20% sobre excedente</p>
                  <p>• $2,038.11+: $288.57 + 30% sobre excedente</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">Variable</p>
                <p className="text-xs text-emerald-600 mt-1">Según tramos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quincena 25 Configuration */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-900">
            Quincena 25 (Beneficio Extraordinario)
          </CardTitle>
          <CardDescription className="text-amber-700">
            Beneficio adicional equivalente al 50% del salario, aplicable a empleados con salario ≤ $1,500.00
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-amber-200">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-amber-900">Características</h4>
                <ul className="text-sm text-amber-800 mt-2 space-y-1 ml-4 list-disc">
                  <li>Período de pago: Entre 15 y 25 de enero de cada año</li>
                  <li>Monto: 50% del salario mensual ordinario</li>
                  <li>Aplica si: Salario base ≤ $1,500.00</li>
                  <li>NO incluye: ISR, ISSS, AFP (calculados solo sobre salario ordinario)</li>
                  <li>Frecuencia: Una vez por año</li>
                </ul>
              </div>
              <div className="border-t border-amber-200 pt-3">
                <p className="text-sm text-amber-700">
                  <strong>Fórmula:</strong> Quincena 25 = Salario Base × 0.50
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurable Deductions Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">
            Descuentos Configurables
          </CardTitle>
          <CardDescription className="text-blue-700">
            Puedes crear y modificar estos descuentos según las necesidades de tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
          <div className="space-y-2">
            <p>
              <strong>AFP:</strong> 10.33% - Administradoras de Fondos de Pensión (sugerido)
            </p>
            <p>
              <strong>ISAPRES:</strong> 7% - Instituto de Salud Privada (sugerido)
            </p>
            <p>
              <strong>Otros Descuentos:</strong> Adelantos, préstamos, multas, etc.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
