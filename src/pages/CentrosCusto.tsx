import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Modal, EmptyState, PageHeader, Badge, Toggle } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Tags, Check, XCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

interface CentroCusto {
  id: string
  nome: string
  codigo: string
  ativo: boolean
  empresa_id: string
  created_at: string
}

export default function CentrosCusto() {
  const { empresaAtivaId } = useAppStore()
  const [centros, setCentros] = useState<CentroCusto[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    id: '', 
    nome: '', 
    codigo: '',
    ativo: true
  })

  useEffect(() => {
    if (empresaAtivaId) {
      carregarDados()
    } else {
      setCentros([])
      setLoading(false)
    }
  }, [empresaAtivaId])

  const carregarDados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('centro_custo')
      .select('*')
      .eq('empresa_id', empresaAtivaId)
      .order('nome', { ascending: true })
    
    if (!error && data) setCentros(data)
    setLoading(false)
  }

  const openModal = (centro?: CentroCusto) => {
    if (centro) {
      setFormData({ 
        id: centro.id, 
        nome: centro.nome, 
        codigo: centro.codigo || '',
        ativo: centro.ativo
      })
    } else {
      setFormData({ 
        id: '', 
        nome: '', 
        codigo: '',
        ativo: true
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim() || !empresaAtivaId) return

    setIsSubmitting(true)
    
    const payload = {
      nome: formData.nome,
      codigo: formData.codigo,
      ativo: formData.ativo,
      empresa_id: empresaAtivaId
    }

    if (formData.id) {
      // Editar
      await supabase.from('centro_custo').update(payload).eq('id', formData.id)
    } else {
      // Criar
      await supabase.from('centro_custo').insert([payload])
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarDados()
  }

  const handleExcluir = async (id: string, nome: string) => {
    if (confirm(`Deseja inativar o centro de custo "${nome}"? Ele deixará de aparecer nas opções de lançamento.`)) {
      await supabase.from('centro_custo').update({ ativo: false }).eq('id', id)
      carregarDados()
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Centros de Custo"
        subtitle="Organize as despesas e receitas por áreas ou departamentos."
        action={
          <Button 
            onClick={() => openModal()} 
            icon={<Plus className="w-4 h-4" />}
            disabled={!empresaAtivaId}
          >
            Novo Centro de Custo
          </Button>
        }
      />

      {loading ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState
          icon={<Tags className="w-full h-full" />}
          title="Selecione uma empresa"
          description="Você precisa selecionar uma empresa no topo da página para gerenciar seus centros de custo."
        />
      ) : centros.length === 0 ? (
        <EmptyState
          icon={<Tags className="w-full h-full" />}
          title="Nenhum centro de custo cadastrado"
          description="Os centros de custo ajudam a entender onde o dinheiro está sendo gasto dentro da empresa."
          action={
            <Button 
              onClick={() => openModal()} 
              icon={<Plus className="w-4 h-4" />}
              size="lg"
            >
              Criar Centro de Custo
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {centros.map((centro) => (
                  <tr key={centro.id} className="hover:bg-slate-50/50 transition-colors duration-fast group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-800">{centro.nome}</span>
                    </td>
                    <td className="px-6 py-4">
                      {centro.codigo ? (
                        <span className="text-sm text-slate-600 font-mono">{centro.codigo}</span>
                      ) : (
                        <span className="text-sm text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {centro.ativo ? (
                        <Badge variant="success" icon={<Check className="w-3 h-3" />}>
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(centro)}
                          title="Editar"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        />
                        {centro.ativo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluir(centro.id, centro.nome)}
                            title="Inativar"
                            className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {centros.map((centro) => (
              <div key={centro.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{centro.nome}</p>
                    {centro.codigo && <p className="text-xs text-slate-400 font-mono mt-0.5">{centro.codigo}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal(centro)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    />
                    {centro.ativo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcluir(centro.id, centro.nome)}
                        className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  {centro.ativo ? (
                    <Badge variant="success" icon={<Check className="w-3 h-3" />}>Ativo</Badge>
                  ) : (
                    <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Inativo</Badge>
                  )}
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
        title={formData.id ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
        subtitle={formData.id ? 'Altere os dados do centro de custo' : 'Crie uma nova classificação por área'}
        icon={<Tags className="w-5 h-5" />}
        size="sm"
      >
        <form onSubmit={handleSalvar}>
          <div className="space-y-4 mb-6">
            <Input
              label="Nome"
              type="text"
              autoFocus
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              placeholder="Ex: Comercial, TI, Diretoria"
              required
            />

            <Input
              label="Código (Opcional)"
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({...formData, codigo: e.target.value})}
              placeholder="Ex: 001"
              className="font-mono"
            />

            <div className="pt-2">
              <Toggle
                checked={formData.ativo}
                onChange={(checked) => setFormData({...formData, ativo: checked})}
                label={formData.ativo ? 'Centro de custo Ativo' : 'Centro de custo Inativo'}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

