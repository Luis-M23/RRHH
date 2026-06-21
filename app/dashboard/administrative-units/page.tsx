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
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'

interface AdministrativeUnit {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function AdministrativeUnitsPage() {
  const [units, setUnits] = useState<AdministrativeUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const supabase = createClient()

  useEffect(() => {
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('administrative_units')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUnits(data || [])
    } catch (error) {
      console.error('Error fetching units:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('administrative_units')
          .update({
            name: formData.name,
            description: formData.description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('administrative_units')
          .insert([
            {
              name: formData.name,
              description: formData.description || null,
            },
          ])

        if (error) throw error
      }

      setFormData({ name: '', description: '' })
      setEditingId(null)
      setIsDialogOpen(false)
      fetchUnits()
    } catch (error) {
      console.error('Error saving unit:', error)
      alert('Error al guardar la unidad administrativa')
    }
  }

  const handleEdit = (unit: AdministrativeUnit) => {
    setFormData({
      name: unit.name,
      description: unit.description || '',
    })
    setEditingId(unit.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta unidad?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('administrative_units')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchUnits()
    } catch (error) {
      console.error('Error deleting unit:', error)
      alert('Error al eliminar la unidad administrativa')
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setFormData({ name: '', description: '' })
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
            <Building2 className="text-emerald-600" size={32} />
            Unidades Administrativas
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona los departamentos y áreas de la empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700">
              <Plus size={20} className="mr-2" />
              Nueva Unidad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Unidad' : 'Nueva Unidad Administrativa'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Actualiza los detalles de la unidad administrativa'
                  : 'Crea una nueva unidad o departamento'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="ej. Recursos Humanos"
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
                  placeholder="ej. Departamento de gestión de personal"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
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

      {/* Units List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando unidades administrativas...</p>
        </div>
      ) : units.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              No hay unidades administrativas registradas
            </p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-emerald-600"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus size={20} className="mr-2" />
              Crear Primera Unidad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <Card key={unit.id} className="border-0 shadow-md hover:shadow-lg transition">
              <CardHeader>
                <CardTitle className="text-lg">{unit.name}</CardTitle>
                {unit.description && (
                  <CardDescription className="text-sm">
                    {unit.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(unit)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => handleDelete(unit.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
