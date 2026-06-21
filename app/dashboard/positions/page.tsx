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
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react'

interface Position {
  id: string
  name: string
  description: string | null
  salary_range_min: number | null
  salary_range_max: number | null
  created_at: string
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    salary_range_min: '',
    salary_range_max: '',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchPositions()
  }, [])

  const fetchPositions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPositions(data || [])
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre del puesto es requerido')
      return
    }

    try {
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        salary_range_min: formData.salary_range_min
          ? parseFloat(formData.salary_range_min)
          : null,
        salary_range_max: formData.salary_range_max
          ? parseFloat(formData.salary_range_max)
          : null,
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        const { error } = await supabase
          .from('positions')
          .update(updateData)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('positions')
          .insert([updateData])

        if (error) throw error
      }

      setFormData({
        name: '',
        description: '',
        salary_range_min: '',
        salary_range_max: '',
      })
      setEditingId(null)
      setIsDialogOpen(false)
      fetchPositions()
    } catch (error) {
      console.error('Error saving position:', error)
      alert('Error al guardar el puesto')
    }
  }

  const handleEdit = (position: Position) => {
    setFormData({
      name: position.name,
      description: position.description || '',
      salary_range_min: position.salary_range_min?.toString() || '',
      salary_range_max: position.salary_range_max?.toString() || '',
    })
    setEditingId(position.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este puesto?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchPositions()
    } catch (error) {
      console.error('Error deleting position:', error)
      alert('Error al eliminar el puesto')
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setFormData({
        name: '',
        description: '',
        salary_range_min: '',
        salary_range_max: '',
      })
      setEditingId(null)
    }
    setIsDialogOpen(open)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start md:items-center gap-4 flex-col md:flex-row">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="text-purple-600" size={32} />
            Puestos
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona los puestos disponibles en la empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700">
              <Plus size={20} className="mr-2" />
              Nuevo Puesto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Puesto' : 'Nuevo Puesto'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Actualiza los detalles del puesto'
                  : 'Crea un nuevo puesto de trabajo'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Puesto *</Label>
                <Input
                  id="name"
                  placeholder="ej. Analista de Sistemas"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  placeholder="ej. Responsable de sistemas informáticos"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="salary_min">Salario Mínimo</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.salary_range_min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salary_range_min: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="salary_max">Salario Máximo</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.salary_range_max}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salary_range_max: e.target.value,
                      })
                    }
                  />
                </div>
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

      {/* Positions List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando puestos...</p>
        </div>
      ) : positions.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              No hay puestos registrados
            </p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-emerald-600"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus size={20} className="mr-2" />
              Crear Primer Puesto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Puesto
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Descripción
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Salario Mín
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Salario Máx
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr
                  key={position.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {position.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {position.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {position.salary_range_min
                      ? `$${parseFloat(position.salary_range_min.toString()).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {position.salary_range_max
                      ? `$${parseFloat(position.salary_range_max.toString()).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(position)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => handleDelete(position.id)}
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
