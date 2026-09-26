import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Modal, EmptyState, PageHeader, Badge } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'

interface Grupo {
  id: string
  nome: string
  created_at: string
}

export default function Grupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ id: '', nome: '' })

  useEffect(() => {
    carregarGrupos()
  }, [])

  const carregarGrupos = async () => {
    const { data, error } = await supabase.from('grupos_economicos').select('*').order('created_at', { ascending: false })
    if (!error && data) setGrupos(data)
    setLoading(false)
  }

  const openModal = (grupo?: Grupo) => {
    if (grupo) {
      setFormData({ id: grupo.id, nome: grupo.nome })
    } else {
      setFormData({ id: '', nome: '' })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setFormData({ id: '', nome: '' })
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim()) return

    setIsSubmitting(true)
    
    if (formData.id) {
      await supabase.from('grupos_economicos').update({ nome: formData.nome }).eq('id', formData.id)
    } else {
      await supabase.from('grupos_economicos').insert([{ nome: formData.nome }])
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarGrupos()
  }

  const handleExcluir = async (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja excluir o grupo "${nome}"? Todas as empresas vinculadas serão apagadas!`)) {
      await supabase.from('grupos_economicos').delete().eq('id', id)
      carregarGrupos()
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Grupos Econômicos"
        subtitle="Gerencie a raiz do seu ecossistema financeiro."
        action={
          <Button 
            onClick={() => openModal()} 
            icon={<Plus className="w-4 h-4" />}
          >
            Novo Grupo
          </Button>
        }
      />

      {loading ? (
        <PageLoading />
      ) : grupos.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-full h-full" />}
          title="Nenhum grupo cadastrado"
          description="O Grupo Econômico é a entidade principal que abriga todas as suas empresas. Comece criando o seu primeiro grupo."
          action={
            <Button 
              onClick={() => openModal()} 
              icon={<Plus className="w-4 h-4" />}
              size="lg"
            >
              Criar meu primeiro Grupo
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome do Grupo</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data de Criação</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {grupos.map((grupo) => (
                  <tr key={grupo.id} className="hover:bg-slate-50/50 transition-colors duration-fast group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {grupo.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-slate-800 font-medium text-sm">{grupo.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(grupo.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="neutral">{grupo.id.split('-')[0]}...</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(grupo)}
                          title="Editar"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluir(grupo.id, grupo.nome)}
                          title="Excluir"
                          className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {grupos.map((grupo) => (
              <div key={grupo.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {grupo.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{grupo.nome}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(grupo.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openModal(grupo)}
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExcluir(grupo.id, grupo.nome)}
                    className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formData.id ? 'Editar Grupo' : 'Novo Grupo Econômico'}
        subtitle={formData.id ? 'Altere o nome do grupo' : 'Crie um grupo para agrupar suas empresas'}
        icon={<Building2 className="w-5 h-5" />}
        size="sm"
      >
        <form onSubmit={handleSalvar}>
          <div className="mb-6">
            <Input
              label="Nome do Grupo"
              type="text"
              autoFocus
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              placeholder="Ex: Grupo Silva S.A."
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar Grupo
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

