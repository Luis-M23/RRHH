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
import { Plus, Edit2, Trash2, TrendingUp } from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const supabase = createClient()

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre del cargo es requerido')
      return
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('roles')
          .update({
            name: formData.name,
            description: formData.description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('roles')
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
      fetchRoles()
    } catch (error) {
      console.error('Error saving role:', error)
      alert('Error al guardar el cargo')
    }
  }

  const handleEdit = (role: Role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
    })
    setEditingId(role.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cargo?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchRoles()
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Error al eliminar el cargo')
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
            <TrendingUp className="text-orange-600" size={32} />
            Cargos
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona los cargos o roles dentro de la empresa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700">
              <Plus size={20} className="mr-2" />
              Nuevo Cargo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Cargo' : 'Nuevo Cargo'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Actualiza los detalles del cargo'
                  : 'Crea un nuevo cargo o rol'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Cargo *</Label>
                <Input
                  id="name"
                  placeholder="ej. Gerente, Supervisor, Asistente"
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
                  placeholder="ej. Responsable del área de sistemas"
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

      {/* Roles List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando cargos...</p>
        </div>
      ) : roles.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              No hay cargos registrados
            </p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-emerald-600"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus size={20} className="mr-2" />
              Crear Primer Cargo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="border-0 shadow-md hover:shadow-lg transition">
              <CardHeader>
                <CardTitle className="text-lg">{role.name}</CardTitle>
                {role.description && (
                  <CardDescription className="text-sm">
                    {role.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(role)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => handleDelete(role.id)}
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
