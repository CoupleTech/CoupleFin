import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Modal, EmptyState, PageHeader } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Shield, Plus, Edit2, Trash2, Save } from 'lucide-react'
import { toast } from '../store/useToastStore'

interface Perfil {
  id: string
  nome: string
  permissoes: any
  created_at: string
}

export default function PerfisAcesso() {
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<{ id?: string, nome: string }>({ nome: '' })

  useEffect(() => {
    carregarPerfis()
  }, [])

  const carregarPerfis = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('perfis_usuario')
      .select('*')
      .order('nome')
    
    if (data) setPerfis(data)
    if (error) toast.error('Erro ao carregar perfis')
    setLoading(false)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim()) return

    setIsSubmitting(true)
    
    if (formData.id) {
      // Edit
      const { error } = await supabase
        .from('perfis_usuario')
        .update({ nome: formData.nome })
        .eq('id', formData.id)
      
      if (error) {
        toast.error('Erro ao atualizar perfil.')
      } else {
        toast.success('Perfil atualizado com sucesso!')
        setIsModalOpen(false)
        carregarPerfis()
      }
    } else {
      // Create
      const { error } = await supabase
        .from('perfis_usuario')
        .insert([{ nome: formData.nome, permissoes: {} }])
      
      if (error) {
        toast.error('Erro ao criar perfil.')
      } else {
        toast.success('Perfil criado com sucesso!')
        setIsModalOpen(false)
        carregarPerfis()
      }
    }
    
    setIsSubmitting(false)
  }

  const handleEdit = (perfil: Perfil) => {
    setFormData({ id: perfil.id, nome: perfil.nome })
    setIsModalOpen(true)
  }

  const handleNovo = () => {
    setFormData({ nome: '' })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este perfil? Usuários vinculados a ele podem perder acessos.')) return
    
    const { error } = await supabase.from('perfis_usuario').delete().eq('id', id)
    if (error) {
      toast.error('Não foi possível excluir. Talvez haja usuários usando este perfil.')
    } else {
      toast.success('Perfil excluído.')
      carregarPerfis()
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Perfis de Acesso"
          subtitle="Crie e gerencie os papéis e permissões para sua equipe."
          action={
            <Button onClick={handleNovo} icon={<Plus className="w-4 h-4" />}>
              Novo Perfil
            </Button>
          }
        />

        {loading ? (
          <PageLoading />
        ) : perfis.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-full h-full text-slate-400" />}
            title="Nenhum perfil cadastrado"
            description="Crie o primeiro perfil de acesso para vincular aos usuários."
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome do Perfil</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {perfis.map((perfil) => (
                  <tr key={perfil.id} className="hover:bg-slate-50/50 transition-colors duration-fast">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-medium text-slate-800">{perfil.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(perfil)}
                          icon={<Edit2 className="w-4 h-4 text-slate-400" />}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(perfil.id)}
                          icon={<Trash2 className="w-4 h-4 text-red-400" />}
                          className="hover:bg-red-50 hover:text-red-600"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={formData.id ? "Editar Perfil" : "Novo Perfil"}
          subtitle="Defina o nome do perfil (ex: Administrador, Visualizador)."
          icon={<Shield className="w-5 h-5" />}
        >
          <form onSubmit={handleSalvar}>
            <div className="space-y-4 mb-6">
              <Input
                label="Nome do Perfil"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Analista Financeiro"
                required
              />
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting} icon={<Save className="w-4 h-4" />}>
                Salvar Perfil
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
